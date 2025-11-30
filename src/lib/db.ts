import mysql from 'mysql2/promise';

export interface DBConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export class MySQLConnector {
  private connection: mysql.Connection | null = null;
  private config: DBConfig;

  constructor(config?: Partial<DBConfig>) {
    this.config = {
      host: config?.host || process.env.DB_HOST || '',
      port: config?.port || 3306,
      user: config?.user || process.env.DB_USERNAME || '',
      password: config?.password || process.env.DB_PASSWORD || '',
      database: config?.database || process.env.DB_DATABASE || '',
    };
  }

  async connect(): Promise<void> {
    try {
      this.connection = await mysql.createConnection(this.config);
      console.log('Connected to the database successfully!');
    } catch (err) {
      console.error('Error connecting to the database:', err);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      console.log('Disconnected from the database.');
    }
  }

  async executeQuery<T>(query: string, params?: any[]): Promise<T[]> {
    if (!this.connection) {
      throw new Error('Not connected to the database');
    }
    const [rows] = await this.connection.execute(query, params);
    return rows as T[];
  }
}
