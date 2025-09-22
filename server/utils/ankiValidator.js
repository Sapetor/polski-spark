const AdmZip = require('adm-zip');
const path = require('path');

/**
 * Anki file validation utility
 * Validates .apkg files for proper format and content
 */
class AnkiValidator {
  constructor() {
    this.MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    this.MIN_FILE_SIZE = 100; // 100 bytes minimum
    this.REQUIRED_FILES = ['collection.anki2'];
    this.OPTIONAL_FILES = ['media'];
  }

  /**
   * Validate an Anki .apkg file
   * @param {Buffer} fileBuffer - The file buffer to validate
   * @param {string} filename - Original filename
   * @returns {Object} Validation result
   */
  validateFile(fileBuffer, filename) {
    const result = {
      valid: false,
      errors: [],
      warnings: [],
      metadata: {}
    };

    try {
      // Basic file checks
      this._validateBasicProperties(fileBuffer, filename, result);
      if (!result.valid && result.errors.length > 0) {
        return result;
      }

      // ZIP format validation
      this._validateZipFormat(fileBuffer, result);
      if (!result.valid && result.errors.length > 0) {
        return result;
      }

      // Anki-specific content validation
      this._validateAnkiContent(fileBuffer, result);

      // If we got here without critical errors, it's valid
      if (result.errors.length === 0) {
        result.valid = true;
      }

    } catch (error) {
      result.errors.push(`Validation error: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate only file format without deep content inspection
   * @param {Buffer} fileBuffer - The file buffer to validate
   * @param {string} filename - Original filename
   * @returns {Object} Quick validation result
   */
  quickValidate(fileBuffer, filename) {
    const result = {
      valid: false,
      errors: [],
      warnings: []
    };

    try {
      this._validateBasicProperties(fileBuffer, filename, result);
      if (result.errors.length === 0) {
        this._validateZipFormat(fileBuffer, result);
      }

      if (result.errors.length === 0) {
        result.valid = true;
      }
    } catch (error) {
      result.errors.push(`Quick validation error: ${error.message}`);
    }

    return result;
  }

  /**
   * Extract basic metadata from Anki file
   * @param {Buffer} fileBuffer - The file buffer
   * @returns {Object} Metadata object
   */
  extractMetadata(fileBuffer) {
    const metadata = {
      fileSize: fileBuffer.length,
      hasMedia: false,
      entryCount: 0,
      estimatedCards: 0
    };

    try {
      const zip = new AdmZip(fileBuffer);
      const entries = zip.getEntries();

      metadata.entryCount = entries.length;
      metadata.hasMedia = entries.some(entry => entry.entryName === 'media');

      // Look for collection database
      const collectionEntry = entries.find(entry => entry.entryName === 'collection.anki2');
      if (collectionEntry) {
        metadata.collectionSize = collectionEntry.header.size;
        // Rough estimation: larger collection = more cards
        metadata.estimatedCards = Math.floor(metadata.collectionSize / 1000);
      }

      // Check for media files
      const mediaFiles = entries.filter(entry =>
        entry.entryName.startsWith('media/') &&
        !entry.isDirectory
      );
      metadata.mediaFileCount = mediaFiles.length;
      metadata.hasMedia = metadata.mediaFileCount > 0;

    } catch (error) {
      metadata.error = error.message;
    }

    return metadata;
  }

  /**
   * Validate basic file properties
   */
  _validateBasicProperties(fileBuffer, filename, result) {
    // Check filename extension
    if (!filename.toLowerCase().endsWith('.apkg')) {
      result.errors.push('File must have .apkg extension. Please export your deck from Anki as a package file.');
    }

    // Check file size
    if (fileBuffer.length < this.MIN_FILE_SIZE) {
      result.errors.push('File is too small to be a valid Anki package.');
    }

    if (fileBuffer.length > this.MAX_FILE_SIZE) {
      result.errors.push(`File is too large. Maximum size is ${this.MAX_FILE_SIZE / (1024 * 1024)}MB.`);
    }

    // Check if buffer is empty
    if (fileBuffer.length === 0) {
      result.errors.push('File is empty.');
    }

    result.metadata.fileSize = fileBuffer.length;
  }

  /**
   * Validate ZIP format
   */
  _validateZipFormat(fileBuffer, result) {
    try {
      const zip = new AdmZip(fileBuffer);
      const entries = zip.getEntries();

      if (entries.length === 0) {
        result.errors.push('Archive is empty or corrupted.');
        return;
      }

      result.metadata.entryCount = entries.length;

      // Check for ZIP corruption by trying to read entries
      let corruptedEntries = 0;
      for (const entry of entries) {
        try {
          // Attempt to read entry header
          if (!entry.entryName || entry.entryName === '') {
            corruptedEntries++;
          }
        } catch (error) {
          corruptedEntries++;
        }
      }

      if (corruptedEntries > 0) {
        result.warnings.push(`${corruptedEntries} corrupted entries found in archive.`);
      }

      if (corruptedEntries === entries.length) {
        result.errors.push('Archive appears to be completely corrupted.');
      }

    } catch (error) {
      if (error.message.includes('Invalid or unsupported zip format')) {
        result.errors.push('Invalid file format. Please upload a valid .apkg file exported from Anki.');
      } else {
        result.errors.push(`ZIP validation failed: ${error.message}`);
      }
    }
  }

  /**
   * Validate Anki-specific content
   */
  _validateAnkiContent(fileBuffer, result) {
    try {
      const zip = new AdmZip(fileBuffer);
      const entries = zip.getEntries();
      const entryNames = entries.map(entry => entry.entryName);

      // Check for required files
      const missingFiles = this.REQUIRED_FILES.filter(
        required => !entryNames.includes(required)
      );

      if (missingFiles.length > 0) {
        result.errors.push(
          `Missing required Anki files: ${missingFiles.join(', ')}. ` +
          'Please ensure you exported a complete deck from Anki.'
        );
        return;
      }

      // Validate collection database
      const collectionEntry = entries.find(entry => entry.entryName === 'collection.anki2');
      if (collectionEntry) {
        this._validateCollectionDatabase(zip, collectionEntry, result);
      }

      // Check for media directory
      const hasMediaDir = entryNames.some(name => name.startsWith('media/'));
      const hasMediaFile = entryNames.includes('media');

      if (hasMediaDir || hasMediaFile) {
        result.metadata.hasMedia = true;
        const mediaFiles = entries.filter(entry =>
          entry.entryName.startsWith('media/') && !entry.isDirectory
        );
        result.metadata.mediaFileCount = mediaFiles.length;

        if (mediaFiles.length > 100) {
          result.warnings.push(`Large number of media files (${mediaFiles.length}). Import may take longer.`);
        }
      }

    } catch (error) {
      result.errors.push(`Content validation failed: ${error.message}`);
    }
  }

  /**
   * Validate collection database
   */
  _validateCollectionDatabase(zip, collectionEntry, result) {
    try {
      const dbData = zip.readFile(collectionEntry);

      if (!dbData || dbData.length === 0) {
        result.errors.push('Collection database is empty.');
        return;
      }

      // Check SQLite magic number
      const sqliteMagic = 'SQLite format 3\0';
      const fileHeader = dbData.slice(0, 16).toString('ascii');

      if (!fileHeader.startsWith('SQLite format 3')) {
        result.errors.push('Collection database is not a valid SQLite file.');
        return;
      }

      result.metadata.collectionSize = dbData.length;

      // If collection is very small, might be empty
      if (dbData.length < 1000) {
        result.warnings.push('Collection database is very small. Deck might be empty.');
      }

      // Estimate content based on file size
      const estimatedCards = Math.floor(dbData.length / 1000);
      result.metadata.estimatedCards = estimatedCards;

      if (estimatedCards === 0) {
        result.warnings.push('Deck appears to contain no cards.');
      }

    } catch (error) {
      result.warnings.push(`Could not validate collection database: ${error.message}`);
    }
  }

  /**
   * Get user-friendly validation summary
   */
  getValidationSummary(validationResult) {
    const summary = {
      isValid: validationResult.valid,
      canImport: validationResult.valid && validationResult.errors.length === 0,
      message: '',
      details: []
    };

    if (summary.canImport) {
      summary.message = 'File is valid and ready for import.';

      if (validationResult.metadata.estimatedCards) {
        summary.details.push(`Estimated ${validationResult.metadata.estimatedCards} cards`);
      }

      if (validationResult.metadata.hasMedia) {
        summary.details.push(`Contains ${validationResult.metadata.mediaFileCount} media files`);
      }

      if (validationResult.warnings.length > 0) {
        summary.details.push(`${validationResult.warnings.length} warnings`);
      }
    } else {
      summary.message = 'File validation failed.';
      summary.details = validationResult.errors;
    }

    return summary;
  }
}

module.exports = AnkiValidator;