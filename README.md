# DeannaPDFs

Generate printable PDF catalogs from ministore image URLs.

## Setup

```bash
pip install -r requirements.txt
```

Create a `.env.local` file with database credentials:
```
DB_HOST=your_host
DB_USERNAME=your_user
DB_PASSWORD=your_password
DB_DATABASE=your_database
```

## Usage

```bash
python explore_db.py                              # Explore database structure
python catalog_generator.py <book_id>             # Generate catalog PDF
python catalog_generator.py <book_id> output.pdf  # Custom output path
```

## How it works

1. Fetches image URLs from `cliperest_clipping` for a given ministore
2. Generates HTML with a magazine-style layout
3. Converts to PDF using WeasyPrint (images fetched by URL, never stored locally)
