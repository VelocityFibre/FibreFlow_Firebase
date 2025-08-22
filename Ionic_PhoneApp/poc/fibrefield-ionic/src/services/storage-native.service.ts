import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

export interface PoleData {
  id: string;
  poleNumber: string;
  projectId: string;
  projectName: string;
  gpsLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  notes: string;
  status: 'incomplete' | 'complete' | 'synced';
  photos: {
    before?: string;
    front?: string;
    side?: string;
    depth?: string;
    concrete?: string;
    compaction?: string;
  };
  createdAt: number;
  updatedAt: number;
  syncedAt?: number;
}

export class NativeStorageService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private readonly dbName = 'fibrefield.db';

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  async initialize(): Promise<void> {
    try {
      // Create SQLite database
      this.db = await this.sqlite.createConnection(
        this.dbName,
        false,
        'no-encryption',
        1,
        false
      );

      await this.db.open();

      // Create tables
      await this.createTables();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const createPoleTable = `
      CREATE TABLE IF NOT EXISTS poles (
        id TEXT PRIMARY KEY,
        pole_number TEXT,
        project_id TEXT NOT NULL,
        project_name TEXT,
        gps_latitude REAL,
        gps_longitude REAL,
        gps_accuracy REAL,
        notes TEXT,
        status TEXT DEFAULT 'incomplete',
        created_at INTEGER,
        updated_at INTEGER,
        synced_at INTEGER
      );
    `;

    const createPhotosTable = `
      CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pole_id TEXT NOT NULL,
        photo_type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        created_at INTEGER,
        FOREIGN KEY (pole_id) REFERENCES poles(id) ON DELETE CASCADE
      );
    `;

    const createSyncQueueTable = `
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pole_id TEXT NOT NULL,
        action TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        last_attempt INTEGER,
        created_at INTEGER,
        FOREIGN KEY (pole_id) REFERENCES poles(id) ON DELETE CASCADE
      );
    `;

    await this.db.execute(createPoleTable);
    await this.db.execute(createPhotosTable);
    await this.db.execute(createSyncQueueTable);

    // Create indexes
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_poles_status ON poles(status);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_poles_project ON poles(project_id);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_sync_queue_pole ON sync_queue(pole_id);');
  }

  async savePole(poleData: PoleData): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT OR REPLACE INTO poles (
        id, pole_number, project_id, project_name,
        gps_latitude, gps_longitude, gps_accuracy,
        notes, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    const values = [
      poleData.id,
      poleData.poleNumber,
      poleData.projectId,
      poleData.projectName,
      poleData.gpsLocation.latitude,
      poleData.gpsLocation.longitude,
      poleData.gpsLocation.accuracy,
      poleData.notes,
      poleData.status,
      poleData.createdAt,
      poleData.updatedAt
    ];

    await this.db.run(query, values);

    // Add to sync queue if not already synced
    if (poleData.status !== 'synced') {
      await this.addToSyncQueue(poleData.id);
    }
  }

  async savePhoto(poleId: string, photoType: string, base64Data: string): Promise<string> {
    try {
      // Generate unique filename
      const fileName = `${poleId}_${photoType}_${Date.now()}.jpg`;
      const filePath = `poles/${poleId}/${fileName}`;

      // Save to file system (not in database - unlimited storage!)
      const result = await Filesystem.writeFile({
        path: filePath,
        data: base64Data,
        directory: Directory.Data,
        recursive: true
      });

      // Store reference in database
      if (this.db) {
        const query = `
          INSERT INTO photos (pole_id, photo_type, file_path, created_at)
          VALUES (?, ?, ?, ?);
        `;
        await this.db.run(query, [poleId, photoType, result.uri, Date.now()]);
      }

      return result.uri;
    } catch (error) {
      console.error('Failed to save photo:', error);
      throw error;
    }
  }

  async getPole(poleId: string): Promise<PoleData | null> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      SELECT * FROM poles WHERE id = ?;
    `;

    const result = await this.db.query(query, [poleId]);
    
    if (result.values && result.values.length > 0) {
      const pole = result.values[0];
      
      // Get photos
      const photosQuery = `
        SELECT photo_type, file_path FROM photos WHERE pole_id = ?;
      `;
      const photosResult = await this.db.query(photosQuery, [poleId]);
      
      const photos: any = {};
      if (photosResult.values) {
        photosResult.values.forEach(photo => {
          photos[photo.photo_type] = photo.file_path;
        });
      }

      return {
        id: pole.id,
        poleNumber: pole.pole_number,
        projectId: pole.project_id,
        projectName: pole.project_name,
        gpsLocation: {
          latitude: pole.gps_latitude,
          longitude: pole.gps_longitude,
          accuracy: pole.gps_accuracy
        },
        notes: pole.notes,
        status: pole.status,
        photos,
        createdAt: pole.created_at,
        updatedAt: pole.updated_at,
        syncedAt: pole.synced_at
      };
    }

    return null;
  }

  async getUncompletePoles(): Promise<PoleData[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      SELECT * FROM poles 
      WHERE status = 'incomplete' 
      ORDER BY updated_at DESC;
    `;

    const result = await this.db.query(query);
    
    const poles: PoleData[] = [];
    if (result.values) {
      for (const pole of result.values) {
        const poleData = await this.getPole(pole.id);
        if (poleData) poles.push(poleData);
      }
    }

    return poles;
  }

  async getUnsyncedPoles(): Promise<PoleData[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      SELECT DISTINCT p.* FROM poles p
      JOIN sync_queue sq ON p.id = sq.pole_id
      WHERE p.status = 'complete'
      ORDER BY p.updated_at ASC;
    `;

    const result = await this.db.query(query);
    
    const poles: PoleData[] = [];
    if (result.values) {
      for (const pole of result.values) {
        const poleData = await this.getPole(pole.id);
        if (poleData) poles.push(poleData);
      }
    }

    return poles;
  }

  async searchPoles(searchTerm: string): Promise<PoleData[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      SELECT * FROM poles 
      WHERE pole_number LIKE ? 
      ORDER BY updated_at DESC 
      LIMIT 20;
    `;

    const result = await this.db.query(query, [`%${searchTerm}%`]);
    
    const poles: PoleData[] = [];
    if (result.values) {
      for (const pole of result.values) {
        const poleData = await this.getPole(pole.id);
        if (poleData) poles.push(poleData);
      }
    }

    return poles;
  }

  async markAsSynced(poleId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      UPDATE poles 
      SET status = 'synced', synced_at = ? 
      WHERE id = ?;
    `;

    await this.db.run(query, [Date.now(), poleId]);

    // Remove from sync queue
    await this.db.run('DELETE FROM sync_queue WHERE pole_id = ?;', [poleId]);
  }

  private async addToSyncQueue(poleId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT OR IGNORE INTO sync_queue (pole_id, action, created_at)
      VALUES (?, 'upload', ?);
    `;

    await this.db.run(query, [poleId, Date.now()]);
  }

  async getStorageStats(): Promise<{used: number, photos: number, poles: number}> {
    try {
      // Get directory size
      const result = await Filesystem.stat({
        path: 'poles',
        directory: Directory.Data
      });

      // Count poles and photos
      let poles = 0;
      let photos = 0;

      if (this.db) {
        const poleCount = await this.db.query('SELECT COUNT(*) as count FROM poles;');
        const photoCount = await this.db.query('SELECT COUNT(*) as count FROM photos;');
        
        poles = poleCount.values?.[0]?.count || 0;
        photos = photoCount.values?.[0]?.count || 0;
      }

      return {
        used: result.size || 0,
        photos,
        poles
      };
    } catch (error) {
      return { used: 0, photos: 0, poles: 0 };
    }
  }

  async clearAllData(): Promise<void> {
    try {
      // Delete all files
      await Filesystem.rmdir({
        path: 'poles',
        directory: Directory.Data,
        recursive: true
      });

      // Clear database tables
      if (this.db) {
        await this.db.execute('DELETE FROM sync_queue;');
        await this.db.execute('DELETE FROM photos;');
        await this.db.execute('DELETE FROM poles;');
      }
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.sqlite.closeConnection(this.dbName, false);
      this.db = null;
    }
  }
}

// Singleton instance
export const storageService = new NativeStorageService();