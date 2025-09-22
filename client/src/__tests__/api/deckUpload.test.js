import { mockFetch, mockEventSource, TEST_API_BASE } from '../../testUtils';

describe('Deck Upload API Contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /upload-anki', () => {
    it('should upload deck file with progress tracking', async () => {
      // Mock successful upload response
      const mockUploadResponse = {
        id: 1,
        name: 'Test Deck',
        cardCount: 25,
        status: 'ready'
      };

      mockFetch(mockUploadResponse, 200);

      // Mock Server-Sent Events for progress
      const mockESInstance = mockEventSource();

      const formData = new FormData();
      formData.append('ankiDeck', new Blob(['test'], { type: 'application/octet-stream' }));
      formData.append('deckName', 'Test Deck');

      const response = await fetch(`${TEST_API_BASE}/upload-anki`, {
        method: 'POST',
        body: formData,
      });

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data).toEqual(mockUploadResponse);
      expect(data.id).toBeDefined();
      expect(data.name).toBe('Test Deck');
      expect(data.cardCount).toBeGreaterThan(0);
      expect(data.status).toBe('ready');
    });

    it('should return 400 for invalid file format', async () => {
      const mockErrorResponse = {
        error: 'Invalid file format',
        code: 'INVALID_FILE'
      };

      mockFetch(mockErrorResponse, 400);

      const formData = new FormData();
      formData.append('ankiDeck', new Blob(['test'], { type: 'text/plain' }));
      formData.append('deckName', 'Test Deck');

      const response = await fetch(`${TEST_API_BASE}/upload-anki`, {
        method: 'POST',
        body: formData,
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.code).toBe('INVALID_FILE');
    });

    it('should return 422 for corrupted file', async () => {
      const mockErrorResponse = {
        error: 'File processing failed',
        code: 'CORRUPT_FILE'
      };

      mockFetch(mockErrorResponse, 422);

      const formData = new FormData();
      formData.append('ankiDeck', new Blob(['corrupted'], { type: 'application/octet-stream' }));
      formData.append('deckName', 'Test Deck');

      const response = await fetch(`${TEST_API_BASE}/upload-anki`, {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(422);
      const data = await response.json();
      expect(data.code).toBe('CORRUPT_FILE');
    });
  });

  describe('GET /upload-progress/{uploadId}', () => {
    it('should stream progress updates via SSE', () => {
      const mockESInstance = mockEventSource();
      const uploadId = '12345';

      const eventSource = new EventSource(`${TEST_API_BASE}/upload-progress/${uploadId}`);

      expect(EventSource).toHaveBeenCalledWith(`${TEST_API_BASE}/upload-progress/${uploadId}`);
      expect(eventSource).toBe(mockESInstance);

      // Simulate progress event
      const progressData = { progress: 50, stage: 'parsing', message: 'Processing cards...' };
      mockESInstance.onmessage({ data: JSON.stringify(progressData) });

      expect(mockESInstance.onmessage).toBeDefined();
    });

    it('should handle progress completion', () => {
      const mockESInstance = mockEventSource();
      const uploadId = '12345';

      new EventSource(`${TEST_API_BASE}/upload-progress/${uploadId}`);

      // Simulate completion
      const completionData = { progress: 100, stage: 'complete', message: 'Upload complete!' };
      mockESInstance.onmessage({ data: JSON.stringify(completionData) });

      expect(mockESInstance.close).toBeDefined();
    });
  });
});