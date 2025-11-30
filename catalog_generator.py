import os
import sys
import tempfile
from datetime import datetime
from sql_utils import MySQLConnector
from dotenv import load_dotenv


def get_ministore_info(connector, book_id):
    query = """
        SELECT id, name, description, coverImage, numClips, created
        FROM cliperest_book 
        WHERE id = %s
    """
    result = connector.execute_query(query, (book_id,))
    return result[0] if result else None


def get_ministore_images(connector, book_id):
    query = """
        SELECT id, caption, text, thumbnail, url, created, num
        FROM cliperest_clipping 
        WHERE book_id = %s 
        ORDER BY num ASC
    """
    result = connector.execute_query(query, (book_id,))
    return result if result else []


def generate_catalog_html(images, title="Product Catalog", description=""):
    image_items = ""
    for img in images:
        img_url = img.get('thumbnail') or img.get('url') or ''
        caption = img.get('caption') or img.get('text') or ''
        
        if img_url:
            image_items += f'''
            <div class="catalog-item">
                <div class="image-wrapper">
                    <img src="{img_url}" alt="{caption}" loading="lazy" />
                </div>
                {f'<p class="caption">{caption}</p>' if caption else ''}
            </div>
            '''
    
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500&display=swap');
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        @page {{
            size: A4;
            margin: 15mm;
        }}
        
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #ffffff;
            color: #1a1a1a;
            line-height: 1.6;
        }}
        
        .cover {{
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            page-break-after: always;
            padding: 40px;
        }}
        
        .cover h1 {{
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 3.5rem;
            font-weight: 700;
            margin-bottom: 20px;
            letter-spacing: -1px;
        }}
        
        .cover .subtitle {{
            font-size: 1.2rem;
            font-weight: 300;
            opacity: 0.9;
            max-width: 500px;
        }}
        
        .cover .date {{
            margin-top: 40px;
            font-size: 0.9rem;
            opacity: 0.7;
        }}
        
        .cover .item-count {{
            margin-top: 15px;
            padding: 8px 24px;
            background: rgba(255,255,255,0.2);
            border-radius: 20px;
            font-size: 0.85rem;
        }}
        
        .catalog-container {{
            padding: 20px 0;
        }}
        
        .catalog-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 25px;
            padding: 20px;
        }}
        
        .catalog-item {{
            break-inside: avoid;
            page-break-inside: avoid;
        }}
        
        .image-wrapper {{
            background: #f8f9fa;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            aspect-ratio: 1;
            display: flex;
            align-items: center;
            justify-content: center;
        }}
        
        .image-wrapper img {{
            width: 100%;
            height: 100%;
            object-fit: cover;
        }}
        
        .caption {{
            margin-top: 10px;
            font-size: 0.85rem;
            color: #555;
            text-align: center;
            font-weight: 400;
        }}

        @media print {{
            .cover {{
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }}
            
            .catalog-item {{
                break-inside: avoid;
            }}
        }}
    </style>
</head>
<body>
    <div class="cover">
        <h1>{title}</h1>
        {f'<p class="subtitle">{description}</p>' if description else ''}
        <p class="date">{datetime.now().strftime("%B %Y")}</p>
        <p class="item-count">{len(images)} items</p>
    </div>
    
    <div class="catalog-container">
        <div class="catalog-grid">
            {image_items}
        </div>
    </div>
</body>
</html>'''
    
    return html


def html_to_pdf_weasyprint(html_content, output_path):
    from weasyprint import HTML
    HTML(string=html_content).write_pdf(output_path)
    return output_path


def html_to_pdf_playwright(html_content, output_path):
    from playwright.sync_api import sync_playwright
    
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
            f.write(html_content)
            temp_path = f.name
        
        page.goto(f'file://{temp_path}')
        page.wait_for_load_state('networkidle')
        
        page.pdf(
            path=output_path,
            format='A4',
            print_background=True,
            margin={'top': '15mm', 'bottom': '15mm', 'left': '15mm', 'right': '15mm'}
        )
        
        browser.close()
        os.unlink(temp_path)
    
    return output_path


def generate_catalog_pdf(book_id, output_path=None, use_playwright=False):
    load_dotenv('.env.local')
    
    connector = MySQLConnector()
    connector.connect()
    
    try:
        ministore = get_ministore_info(connector, book_id)
        if not ministore:
            raise ValueError(f"Ministore with ID {book_id} not found")
        
        images = get_ministore_images(connector, book_id)
        if not images:
            raise ValueError(f"No images found for ministore {book_id}")
        
        print(f"Found {len(images)} images for ministore: {ministore['name']}")
        
        html = generate_catalog_html(
            images=images,
            title=ministore.get('name', 'Product Catalog'),
            description=ministore.get('description', '')
        )
        
        if not output_path:
            safe_name = "".join(c if c.isalnum() else "_" for c in ministore['name'])
            output_path = f"catalog_{safe_name}_{book_id}.pdf"
        
        if use_playwright:
            result = html_to_pdf_playwright(html, output_path)
        else:
            result = html_to_pdf_weasyprint(html, output_path)
        
        print(f"PDF generated: {result}")
        return result
        
    finally:
        connector.disconnect()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python catalog_generator.py <book_id> [output_path]")
        sys.exit(1)
    
    book_id = int(sys.argv[1])
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    generate_catalog_pdf(book_id, output_path)
