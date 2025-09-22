const AdmZip = require('adm-zip');
const knex = require('knex');
const crypto = require('crypto');
const path = require('path');

/**
 * Anki .apkg file parser
 * Extracts cards, notes, and metadata from Anki packages
 */
class AnkiParser {
  constructor(knexConfig) {
    this.knexConfig = knexConfig;
    this.tempDbConnections = new Map();
  }

  /**
   * Parse an Anki .apkg file and extract all data
   * @param {Buffer} fileBuffer - The .apkg file buffer
   * @param {string} filename - Original filename
   * @returns {Object} Parsed data
   */
  async parseAnkiFile(fileBuffer, filename) {
    const result = {
      success: false,
      deckInfo: null,
      cards: [],
      notes: [],
      media: [],
      errors: [],
      warnings: [],
      metadata: {}
    };

    let tempDbPath = null;
    let tempDb = null;

    try {
      // Extract ZIP contents
      const zip = new AdmZip(fileBuffer);
      const entries = zip.getEntries();

      // Extract collection database to temp location
      const collectionEntry = entries.find(entry => entry.entryName === 'collection.anki2');
      if (!collectionEntry) {
        result.errors.push('No collection database found in package');
        return result;
      }

      // Create temporary database file
      tempDbPath = `/tmp/anki_temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.db`;
      const fs = require('fs');
      fs.writeFileSync(tempDbPath, zip.readFile(collectionEntry));

      // Connect to temporary database
      tempDb = knex({
        client: 'sqlite3',
        connection: { filename: tempDbPath },
        useNullAsDefault: true
      });

      // Parse deck information
      result.deckInfo = await this._parseDeckInfo(tempDb, filename);

      // Parse notes and cards
      const notes = await this._parseNotes(tempDb);
      const cards = await this._parseCards(tempDb, notes);

      result.notes = notes;
      result.cards = cards;

      // Parse media information
      result.media = this._parseMedia(zip, entries);

      // Generate metadata
      result.metadata = this._generateMetadata(fileBuffer, result, filename);

      result.success = true;

    } catch (error) {
      result.errors.push(`Parsing failed: ${error.message}`);
    } finally {
      // Cleanup
      if (tempDb) {
        await tempDb.destroy();
      }
      if (tempDbPath && require('fs').existsSync(tempDbPath)) {
        require('fs').unlinkSync(tempDbPath);
      }
    }

    return result;
  }

  /**
   * Extract deck information from collection
   */
  async _parseDeckInfo(db, filename) {
    try {
      // Get deck information from collection
      const colResult = await db.select('*').from('col').first();

      if (!colResult) {
        throw new Error('No collection data found');
      }

      // Parse collection configuration
      let conf = {};
      let decks = {};

      try {
        conf = JSON.parse(colResult.conf || '{}');
        decks = JSON.parse(colResult.decks || '{}');
      } catch (parseError) {
        // If JSON parsing fails, continue with defaults
      }

      // Extract deck information
      const deckInfo = {
        originalFilename: filename,
        ankiVersion: colResult.ver || 'unknown',
        created: new Date(colResult.crt * 1000),
        modified: new Date(colResult.mod),
        schemaModified: new Date(colResult.scm),
        usn: colResult.usn,
        decks: []
      };

      // Process individual decks
      for (const [deckId, deckData] of Object.entries(decks)) {
        if (deckData && typeof deckData === 'object') {
          deckInfo.decks.push({
            id: deckId,
            name: deckData.name || 'Unknown Deck',
            description: deckData.desc || '',
            created: deckData.mod ? new Date(deckData.mod * 1000) : new Date(),
            collapsed: deckData.collapsed || false,
            browserCollapsed: deckData.browserCollapsed || false,
            extendRev: deckData.extendRev || 50,
            extendNew: deckData.extendNew || 10
          });
        }
      }

      return deckInfo;

    } catch (error) {
      throw new Error(`Failed to parse deck info: ${error.message}`);
    }
  }

  /**
   * Parse notes from the collection
   */
  async _parseNotes(db) {
    try {
      const notes = await db.select('*').from('notes');

      return notes.map(note => ({
        id: note.id,
        guid: note.guid,
        modelId: note.mid,
        modified: new Date(note.mod * 1000),
        usn: note.usn,
        tags: note.tags ? note.tags.trim().split(/\s+/).filter(tag => tag) : [],
        fields: note.flds ? note.flds.split('\x1f') : [],
        sortField: note.sfld,
        checksum: note.csum,
        flags: note.flags,
        data: note.data
      }));

    } catch (error) {
      throw new Error(`Failed to parse notes: ${error.message}`);
    }
  }

  /**
   * Parse cards from the collection
   */
  async _parseCards(db, notes) {
    try {
      const cards = await db.select('*').from('cards');
      const noteMap = new Map(notes.map(note => [note.id, note]));

      return cards.map(card => {
        const note = noteMap.get(card.nid);

        // Extract front and back from note fields
        let front = '';
        let back = '';

        if (note && note.fields.length >= 2) {
          front = this._cleanHtml(note.fields[0] || '');
          back = this._cleanHtml(note.fields[1] || '');
        } else if (note && note.fields.length === 1) {
          front = this._cleanHtml(note.fields[0] || '');
          back = note.sortField || '';
        }

        return {
          id: card.id,
          noteId: card.nid,
          deckId: card.did,
          ordinal: card.ord,
          modified: new Date(card.mod * 1000),
          usn: card.usn,
          type: card.type,
          queue: card.queue,
          due: card.due,
          interval: card.ivl,
          factor: card.factor,
          reviews: card.reps,
          lapses: card.lapses,
          left: card.left,
          originalDue: card.odue,
          originalDeckId: card.odid,
          flags: card.flags,
          data: card.data,
          // Processed fields for Polski Spark
          front: front,
          back: back,
          note: note
        };
      });

    } catch (error) {
      throw new Error(`Failed to parse cards: ${error.message}`);
    }
  }

  /**
   * Parse media files from the package
   */
  _parseMedia(zip, entries) {
    const mediaFiles = [];

    try {
      // Look for media directory or media file
      const mediaEntry = entries.find(entry => entry.entryName === 'media');

      if (mediaEntry) {
        // Parse media index file
        const mediaData = zip.readFile(mediaEntry);
        if (mediaData) {
          try {
            const mediaIndex = JSON.parse(mediaData.toString());

            for (const [key, filename] of Object.entries(mediaIndex)) {
              mediaFiles.push({
                key: key,
                filename: filename,
                originalPath: `media/${key}`,
                exists: entries.some(entry => entry.entryName === key)
              });
            }
          } catch (parseError) {
            // If media index is not JSON, skip
          }
        }
      }

      // Also check for direct media files
      const directMediaFiles = entries.filter(entry =>
        entry.entryName.match(/^\d+$/) && !entry.isDirectory
      );

      for (const mediaFile of directMediaFiles) {
        if (!mediaFiles.some(mf => mf.key === mediaFile.entryName)) {
          mediaFiles.push({
            key: mediaFile.entryName,
            filename: `media_${mediaFile.entryName}`,
            originalPath: mediaFile.entryName,
            exists: true,
            size: mediaFile.header.size
          });
        }
      }

    } catch (error) {
      // Media parsing is not critical, continue without it
    }

    return mediaFiles;
  }

  /**
   * Generate comprehensive metadata
   */
  _generateMetadata(fileBuffer, parseResult, filename) {
    const metadata = {
      originalFilename: filename,
      fileSize: fileBuffer.length,
      fileChecksum: crypto.createHash('md5').update(fileBuffer).digest('hex'),
      parsedAt: new Date(),
      cardCount: parseResult.cards.length,
      noteCount: parseResult.notes.length,
      mediaFileCount: parseResult.media.length,
      hasMedia: parseResult.media.length > 0,
      deckCount: parseResult.deckInfo ? parseResult.deckInfo.decks.length : 1,
      ankiVersion: parseResult.deckInfo ? parseResult.deckInfo.ankiVersion : 'unknown'
    };

    // Calculate difficulty distribution (basic estimation)
    if (parseResult.cards.length > 0) {
      const intervals = parseResult.cards.map(card => card.interval || 0);
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

      metadata.averageInterval = avgInterval;
      metadata.estimatedDifficulty = avgInterval < 1 ? 'beginner' :
                                   avgInterval < 30 ? 'intermediate' : 'advanced';
    }

    return metadata;
  }

  /**
   * Clean HTML from Anki fields
   */
  _cleanHtml(html) {
    if (!html) return '';

    // Remove HTML tags but preserve content
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Convert parsed data to Polski Spark format
   */
  convertToPolskiSparkFormat(parseResult, targetDeckName = null) {
    const converted = {
      deck: {
        name: targetDeckName || this._generateDeckName(parseResult),
        description: this._generateDeckDescription(parseResult),
        anki_metadata: parseResult.metadata,
        import_status: 'processing'
      },
      cards: [],
      import_session: {
        filename: parseResult.metadata.originalFilename,
        file_size: parseResult.metadata.fileSize,
        cards_imported: 0,
        cards_failed: 0,
        status: 'processing'
      }
    };

    // Convert cards
    for (const card of parseResult.cards) {
      if (!card.front || !card.back) {
        converted.import_session.cards_failed++;
        continue;
      }

      const convertedCard = {
        front: card.front,
        back: card.back,
        difficulty: this._estimateCardDifficulty(card),
        topic: this._extractTopic(card),
        anki_note_id: card.noteId.toString(),
        anki_model: card.note ? card.note.modelId.toString() : 'unknown',
        anki_fields: card.note ? card.note.fields : [],
        anki_tags: card.note ? card.note.tags : [],
        media_files: this._extractCardMediaFiles(card, parseResult.media),
        import_date: new Date()
      };

      converted.cards.push(convertedCard);
      converted.import_session.cards_imported++;
    }

    return converted;
  }

  /**
   * Generate deck name from parsed data
   */
  _generateDeckName(parseResult) {
    if (parseResult.deckInfo && parseResult.deckInfo.decks.length > 0) {
      const mainDeck = parseResult.deckInfo.decks[0];
      return mainDeck.name || 'Imported Anki Deck';
    }

    const filename = parseResult.metadata.originalFilename || 'unknown.apkg';
    return filename.replace('.apkg', '').replace(/[^a-zA-Z0-9\s]/g, ' ').trim() || 'Imported Anki Deck';
  }

  /**
   * Generate deck description
   */
  _generateDeckDescription(parseResult) {
    const cardCount = parseResult.cards.length;
    const mediaCount = parseResult.media.length;
    const importDate = new Date().toLocaleDateString();

    let description = `Imported from Anki on ${importDate}. Contains ${cardCount} cards`;

    if (mediaCount > 0) {
      description += ` with ${mediaCount} media files`;
    }

    description += '.';

    return description;
  }

  /**
   * Estimate card difficulty based on Anki statistics
   */
  _estimateCardDifficulty(card) {
    // Use Anki's interval and review data to estimate difficulty
    const interval = card.interval || 0;
    const reviews = card.reviews || 0;
    const lapses = card.lapses || 0;

    // Cards with many lapses are probably difficult
    if (lapses > 3) return 'advanced';

    // Cards with long intervals are probably easy
    if (interval > 30) return 'beginner';

    // Cards with medium intervals are intermediate
    if (interval > 7) return 'intermediate';

    // New cards or cards with short intervals
    if (reviews === 0 || interval < 3) {
      // Check text length as a heuristic
      const textLength = (card.front + card.back).length;
      if (textLength > 200) return 'advanced';
      if (textLength > 100) return 'intermediate';
      return 'beginner';
    }

    return 'intermediate';
  }

  /**
   * Extract topic from card content
   */
  _extractTopic(card) {
    // Simple topic extraction based on content
    const text = (card.front + ' ' + card.back).toLowerCase();

    // Polish language topics
    if (text.includes('czas') || text.includes('verb')) return 'verbs';
    if (text.includes('liczba') || text.includes('number')) return 'numbers';
    if (text.includes('kolor') || text.includes('color')) return 'colors';
    if (text.includes('jedzenie') || text.includes('food')) return 'food';
    if (text.includes('rodzina') || text.includes('family')) return 'family';
    if (text.includes('dom') || text.includes('house')) return 'home';
    if (text.includes('praca') || text.includes('work')) return 'work';
    if (text.includes('szkoła') || text.includes('school')) return 'education';

    return 'general';
  }

  /**
   * Extract media files referenced by a card
   */
  _extractCardMediaFiles(card, allMedia) {
    const mediaFiles = [];
    const text = card.front + ' ' + card.back;

    // Look for media references in card text
    const mediaRegex = /\[sound:([^\]]+)\]|<img[^>]+src=['"]([^'"]+)['"][^>]*>/gi;
    let match;

    while ((match = mediaRegex.exec(text)) !== null) {
      const filename = match[1] || match[2];
      const mediaFile = allMedia.find(m => m.filename === filename);

      if (mediaFile) {
        mediaFiles.push(mediaFile.filename);
      }
    }

    return mediaFiles;
  }
}

module.exports = AnkiParser;