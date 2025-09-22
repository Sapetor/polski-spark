const crypto = require('crypto');

/**
 * Import tracking service for monitoring Anki import progress
 * Manages import sessions, status updates, and error logging
 */
class ImportTracker {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new import session
   * @param {string} filename - Original filename
   * @param {number} fileSize - File size in bytes
   * @returns {Object} Import session record
   */
  async createImportSession(filename, fileSize) {
    try {
      const [importId] = await this.db('anki_imports').insert({
        filename: filename,
        file_size: fileSize,
        status: 'pending',
        cards_imported: 0,
        cards_failed: 0,
        error_log: JSON.stringify([]),
        created_at: this.db.fn.now(),
        updated_at: this.db.fn.now()
      }).returning('id');

      const sessionId = typeof importId === 'object' ? importId.id : importId;

      return await this.getImportSession(sessionId);

    } catch (error) {
      throw new Error(`Failed to create import session: ${error.message}`);
    }
  }

  /**
   * Get import session by ID
   * @param {number} importId - Import session ID
   * @returns {Object} Import session record
   */
  async getImportSession(importId) {
    try {
      const session = await this.db('anki_imports')
        .where('id', importId)
        .first();

      if (!session) {
        throw new Error(`Import session ${importId} not found`);
      }

      // Parse JSON fields
      session.error_log = this._parseJsonField(session.error_log, []);

      return session;

    } catch (error) {
      throw new Error(`Failed to get import session: ${error.message}`);
    }
  }

  /**
   * Update import session status
   * @param {number} importId - Import session ID
   * @param {string} status - New status (pending, processing, completed, error)
   * @param {Object} updates - Additional fields to update
   */
  async updateImportStatus(importId, status, updates = {}) {
    try {
      const updateData = {
        status: status,
        updated_at: this.db.fn.now(),
        ...updates
      };

      // Ensure JSON fields are properly stringified
      if (updateData.error_log && Array.isArray(updateData.error_log)) {
        updateData.error_log = JSON.stringify(updateData.error_log);
      }

      await this.db('anki_imports')
        .where('id', importId)
        .update(updateData);

      return await this.getImportSession(importId);

    } catch (error) {
      throw new Error(`Failed to update import status: ${error.message}`);
    }
  }

  /**
   * Start processing an import
   * @param {number} importId - Import session ID
   */
  async startProcessing(importId) {
    return await this.updateImportStatus(importId, 'processing', {
      import_duration: null // Will be calculated at completion
    });
  }

  /**
   * Complete import successfully
   * @param {number} importId - Import session ID
   * @param {Object} stats - Import statistics
   */
  async completeImport(importId, stats = {}) {
    const session = await this.getImportSession(importId);
    const startTime = new Date(session.created_at);
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000; // seconds

    return await this.updateImportStatus(importId, 'completed', {
      cards_imported: stats.cardsImported || 0,
      cards_failed: stats.cardsFailed || 0,
      import_duration: duration,
      error_log: JSON.stringify(stats.warnings || [])
    });
  }

  /**
   * Mark import as failed
   * @param {number} importId - Import session ID
   * @param {string} errorMessage - Main error message
   * @param {Array} errorDetails - Detailed error information
   */
  async failImport(importId, errorMessage, errorDetails = []) {
    const session = await this.getImportSession(importId);
    const startTime = new Date(session.created_at);
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    const errorLog = [
      {
        timestamp: endTime.toISOString(),
        error: errorMessage,
        details: errorDetails
      },
      ...session.error_log
    ];

    return await this.updateImportStatus(importId, 'error', {
      import_duration: duration,
      error_log: JSON.stringify(errorLog)
    });
  }

  /**
   * Add warning to import session
   * @param {number} importId - Import session ID
   * @param {string} warning - Warning message
   */
  async addWarning(importId, warning) {
    try {
      const session = await this.getImportSession(importId);
      const warnings = session.error_log || [];

      warnings.push({
        timestamp: new Date().toISOString(),
        type: 'warning',
        message: warning
      });

      await this.updateImportStatus(importId, session.status, {
        error_log: warnings
      });

    } catch (error) {
      // Don't fail import for warning tracking issues
      console.error('Failed to add warning:', error.message);
    }
  }

  /**
   * Update import progress
   * @param {number} importId - Import session ID
   * @param {number} cardsImported - Cards successfully imported so far
   * @param {number} cardsFailed - Cards that failed to import
   */
  async updateProgress(importId, cardsImported, cardsFailed = 0) {
    try {
      await this.updateImportStatus(importId, 'processing', {
        cards_imported: cardsImported,
        cards_failed: cardsFailed
      });

    } catch (error) {
      // Don't fail import for progress tracking issues
      console.error('Failed to update progress:', error.message);
    }
  }

  /**
   * Get all import sessions
   * @param {Object} options - Query options
   * @returns {Array} Import sessions
   */
  async getImportHistory(options = {}) {
    try {
      let query = this.db('anki_imports');

      if (options.status) {
        query = query.where('status', options.status);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      query = query.orderBy('created_at', 'desc');

      const sessions = await query;

      // Parse JSON fields for all sessions
      return sessions.map(session => ({
        ...session,
        error_log: this._parseJsonField(session.error_log, [])
      }));

    } catch (error) {
      throw new Error(`Failed to get import history: ${error.message}`);
    }
  }

  /**
   * Get detailed import information with related deck data
   * @param {number} importId - Import session ID
   * @returns {Object} Detailed import information
   */
  async getImportDetails(importId) {
    try {
      const session = await this.getImportSession(importId);

      // Find related deck
      const deck = await this.db('decks')
        .where('anki_import_id', importId)
        .first();

      const details = {
        ...session,
        deckId: deck ? deck.id : null,
        deckName: deck ? deck.name : null,
        importStats: {
          cardsImported: session.cards_imported,
          cardsSkipped: session.cards_failed,
          errors: session.error_log.filter(log => log.type !== 'warning'),
          warnings: session.error_log.filter(log => log.type === 'warning')
        }
      };

      return details;

    } catch (error) {
      throw new Error(`Failed to get import details: ${error.message}`);
    }
  }

  /**
   * Check for duplicate imports
   * @param {string} filename - Original filename
   * @param {string} checksum - File checksum
   * @returns {Object} Duplicate check result
   */
  async checkForDuplicates(filename, checksum) {
    try {
      // Check by filename
      const filenameDuplicate = await this.db('anki_imports')
        .where('filename', filename)
        .where('status', 'completed')
        .first();

      // Check by checksum in decks table
      const checksumDuplicate = await this.db('decks')
        .where('file_checksum', checksum)
        .first();

      return {
        hasDuplicateFilename: !!filenameDuplicate,
        hasDuplicateChecksum: !!checksumDuplicate,
        duplicateImport: filenameDuplicate,
        duplicateDeck: checksumDuplicate
      };

    } catch (error) {
      // Don't fail import for duplicate checking issues
      console.error('Failed to check duplicates:', error.message);
      return {
        hasDuplicateFilename: false,
        hasDuplicateChecksum: false
      };
    }
  }

  /**
   * Clean up old import sessions
   * @param {number} daysOld - Remove sessions older than this many days
   * @returns {number} Number of sessions removed
   */
  async cleanupOldSessions(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deleted = await this.db('anki_imports')
        .where('created_at', '<', cutoffDate)
        .whereIn('status', ['completed', 'error'])
        .del();

      return deleted;

    } catch (error) {
      console.error('Failed to cleanup old sessions:', error.message);
      return 0;
    }
  }

  /**
   * Get import statistics
   * @param {Object} options - Filter options
   * @returns {Object} Import statistics
   */
  async getImportStatistics(options = {}) {
    try {
      const stats = await this.db('anki_imports')
        .select(
          this.db.raw('COUNT(*) as total_imports'),
          this.db.raw('COUNT(CASE WHEN status = "completed" THEN 1 END) as successful_imports'),
          this.db.raw('COUNT(CASE WHEN status = "error" THEN 1 END) as failed_imports'),
          this.db.raw('COUNT(CASE WHEN status = "processing" THEN 1 END) as processing_imports'),
          this.db.raw('SUM(cards_imported) as total_cards_imported'),
          this.db.raw('SUM(cards_failed) as total_cards_failed'),
          this.db.raw('AVG(import_duration) as average_duration'),
          this.db.raw('SUM(file_size) as total_file_size')
        )
        .first();

      return {
        totalImports: stats.total_imports || 0,
        successfulImports: stats.successful_imports || 0,
        failedImports: stats.failed_imports || 0,
        processingImports: stats.processing_imports || 0,
        totalCardsImported: stats.total_cards_imported || 0,
        totalCardsFailed: stats.total_cards_failed || 0,
        averageDuration: stats.average_duration || 0,
        totalFileSize: stats.total_file_size || 0,
        successRate: stats.total_imports > 0 ?
          (stats.successful_imports / stats.total_imports * 100).toFixed(2) : 0
      };

    } catch (error) {
      throw new Error(`Failed to get import statistics: ${error.message}`);
    }
  }

  /**
   * Parse JSON field safely
   */
  _parseJsonField(jsonString, defaultValue = null) {
    if (!jsonString) return defaultValue;

    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return defaultValue;
    }
  }

  /**
   * Generate unique import ID for tracking
   */
  _generateImportId() {
    return crypto.randomBytes(16).toString('hex');
  }
}

module.exports = ImportTracker;