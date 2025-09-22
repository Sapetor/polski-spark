import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../testUtils';
import DeckUpload from '../../components/DeckUpload';

// Mock file for testing
const createMockFile = (name = 'test.apkg', type = 'application/octet-stream') => {
  return new File(['test content'], name, { type });
};

describe('DeckUpload Component', () => {
  const mockOnUpload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render upload form elements', () => {
    renderWithProviders(<DeckUpload onUpload={mockOnUpload} />);

    expect(screen.getByPlaceholderText('Deck Name')).toBeInTheDocument();
    expect(screen.getByText('Choose File')).toBeInTheDocument();
    expect(screen.getByText('Upload Deck')).toBeInTheDocument();
  });

  it('should disable upload button when no file or name', () => {
    renderWithProviders(<DeckUpload onUpload={mockOnUpload} />);

    const uploadButton = screen.getByText('Upload Deck');
    expect(uploadButton).toBeDisabled();
  });

  it('should enable upload button when file and name provided', () => {
    renderWithProviders(<DeckUpload onUpload={mockOnUpload} />);

    const nameInput = screen.getByPlaceholderText('Deck Name');
    const fileInput = screen.getByRole('button', { name: /choose file/i }).nextSibling;

    fireEvent.change(nameInput, { target: { value: 'Test Deck' } });
    fireEvent.change(fileInput, { target: { files: [createMockFile()] } });

    const uploadButton = screen.getByText('Upload Deck');
    expect(uploadButton).not.toBeDisabled();
  });

  it('should call onUpload with correct parameters', async () => {
    const mockFile = createMockFile('test-deck.apkg');
    const mockSetProgress = jest.fn();

    renderWithProviders(<DeckUpload onUpload={mockOnUpload} />);

    const nameInput = screen.getByPlaceholderText('Deck Name');
    const fileInput = screen.getByRole('button', { name: /choose file/i }).nextSibling;
    const uploadButton = screen.getByText('Upload Deck');

    fireEvent.change(nameInput, { target: { value: 'My Test Deck' } });
    fireEvent.change(fileInput, { target: { files: [mockFile] } });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(
        mockFile,
        'My Test Deck',
        expect.any(Function) // setProgress function
      );
    });
  });

  it('should show progress bar during upload', async () => {
    renderWithProviders(<DeckUpload onUpload={mockOnUpload} />);

    const nameInput = screen.getByPlaceholderText('Deck Name');
    const fileInput = screen.getByRole('button', { name: /choose file/i }).nextSibling;
    const uploadButton = screen.getByText('Upload Deck');

    fireEvent.change(nameInput, { target: { value: 'Test Deck' } });
    fireEvent.change(fileInput, { target: { files: [createMockFile()] } });
    fireEvent.click(uploadButton);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(uploadButton).toBeDisabled();
  });

  it('should display file name and size when selected', () => {
    const mockFile = createMockFile('my-polish-deck.apkg');
    Object.defineProperty(mockFile, 'size', { value: 1024 * 50 }); // 50KB

    renderWithProviders(<DeckUpload onUpload={mockOnUpload} />);

    const fileInput = screen.getByRole('button', { name: /choose file/i }).nextSibling;
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    expect(screen.getByText(/my-polish-deck.apkg/)).toBeInTheDocument();
    expect(screen.getByText(/50 KB/)).toBeInTheDocument();
  });

  it('should reset form after successful upload', async () => {
    const mockOnUploadSuccess = jest.fn().mockResolvedValue();

    renderWithProviders(<DeckUpload onUpload={mockOnUploadSuccess} />);

    const nameInput = screen.getByPlaceholderText('Deck Name');
    const fileInput = screen.getByRole('button', { name: /choose file/i }).nextSibling;

    fireEvent.change(nameInput, { target: { value: 'Test Deck' } });
    fireEvent.change(fileInput, { target: { files: [createMockFile()] } });
    fireEvent.click(screen.getByText('Upload Deck'));

    await waitFor(() => {
      expect(nameInput.value).toBe('');
      expect(screen.getByText('Choose File')).toBeInTheDocument();
    });
  });

  it('should handle upload errors gracefully', async () => {
    const mockOnUploadError = jest.fn().mockRejectedValue(new Error('Upload failed'));

    renderWithProviders(<DeckUpload onUpload={mockOnUploadError} />);

    const nameInput = screen.getByPlaceholderText('Deck Name');
    const fileInput = screen.getByRole('button', { name: /choose file/i }).nextSibling;

    fireEvent.change(nameInput, { target: { value: 'Test Deck' } });
    fireEvent.change(fileInput, { target: { files: [createMockFile()] } });
    fireEvent.click(screen.getByText('Upload Deck'));

    await waitFor(() => {
      expect(screen.getByText('Upload Deck')).not.toBeDisabled();
    });
  });
});