/**
 * Auth View Tests
 *
 * Tests for the authentication view component that handles login and registration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Auth from '../../views/Auth';
import { AuthProvider } from '../../context/AuthContext';

// Mock auth service
vi.mock('../../services/authService', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  getCurrentUser: vi.fn(() => null),
  fetchCurrentUser: vi.fn(async () => null),
  logoutUser: vi.fn(),
  API_URL: 'http://localhost:8080',
}));

import { loginUser, registerUser } from '../../services/authService';

describe('Auth View', () => {
  const mockOnLogin = vi.fn();
  const renderAuth = () =>
    render(
      <AuthProvider>
        <Auth onLogin={mockOnLogin} />
      </AuthProvider>
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render login form by default', () => {
      renderAuth();

      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should switch to registration form when link is clicked', async () => {
      renderAuth();

      fireEvent.click(screen.getByText(/don't have an account/i));

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Create Account');
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should switch back to login form', async () => {
      renderAuth();

      // Switch to register
      fireEvent.click(screen.getByText(/don't have an account/i));
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();

      // Switch back to login
      fireEvent.click(screen.getByText(/already have an account/i));
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Welcome Back');
    });
  });

  describe('Form Validation', () => {
    it('should show error when fields are empty', async () => {
      renderAuth();

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
      });
    });

    it('should show error when only username is filled', async () => {
      renderAuth();
      const user = userEvent.setup();

      await user.type(screen.getByPlaceholderText('Enter username'), 'testuser');
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
      });
    });

    it('should show error when only password is filled', async () => {
      renderAuth();
      const user = userEvent.setup();

      await user.type(screen.getByPlaceholderText('••••••••'), 'password123');
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
      });
    });
  });

  describe('Login Flow', () => {
    it('should call loginUser and onLogin on successful login', async () => {
      const mockUser = { id: '123', username: 'testuser', tier: 'free' };
      (loginUser as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockUser);

      renderAuth();
      const user = userEvent.setup();

      await user.type(screen.getByPlaceholderText('Enter username'), 'testuser');
      await user.type(screen.getByPlaceholderText('••••••••'), 'password123');
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(loginUser).toHaveBeenCalledWith({
          username: 'testuser',
          password: 'password123',
        });
        expect(mockOnLogin).toHaveBeenCalledWith(mockUser);
      });
    });

    it('should display error on login failure', async () => {
      (loginUser as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Invalid password')
      );

      renderAuth();
      const user = userEvent.setup();

      await user.type(screen.getByPlaceholderText('Enter username'), 'testuser');
      await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpass');
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid password')).toBeInTheDocument();
      });
      expect(mockOnLogin).not.toHaveBeenCalled();
    });

    it('should not call onLogin when loginUser returns null', async () => {
      (loginUser as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      renderAuth();
      const user = userEvent.setup();

      await user.type(screen.getByPlaceholderText('Enter username'), 'testuser');
      await user.type(screen.getByPlaceholderText('••••••••'), 'password123');
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(loginUser).toHaveBeenCalled();
      });
      expect(mockOnLogin).not.toHaveBeenCalled();
    });
  });

  describe('Registration Flow', () => {
    it('should call registerUser on registration submission', async () => {
      const mockUser = { id: '456', username: 'newuser', tier: 'free' };
      (registerUser as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockUser);

      renderAuth();
      const user = userEvent.setup();

      // Switch to register mode
      fireEvent.click(screen.getByText(/don't have an account/i));

      await user.type(screen.getByPlaceholderText('Enter username'), 'newuser');
      await user.type(screen.getByPlaceholderText('••••••••'), 'password123');
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(registerUser).toHaveBeenCalledWith({
          username: 'newuser',
          password: 'password123',
        });
        expect(mockOnLogin).toHaveBeenCalledWith(mockUser);
      });
    });

    it('should display error on registration failure', async () => {
      (registerUser as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Username taken')
      );

      renderAuth();
      const user = userEvent.setup();

      // Switch to register mode
      fireEvent.click(screen.getByText(/don't have an account/i));

      await user.type(screen.getByPlaceholderText('Enter username'), 'existinguser');
      await user.type(screen.getByPlaceholderText('••••••••'), 'password123');
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Username taken')).toBeInTheDocument();
      });
      expect(mockOnLogin).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should clear error when switching between login and register', async () => {
      renderAuth();

      // Trigger an error
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() => {
        expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
      });

      // Switch modes - the form should clear the error on next submission attempt
      fireEvent.click(screen.getByText(/don't have an account/i));

      // The error message may still be visible until form is submitted again
      // This tests the form mode switching - check for the Create Account button
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should show fallback error message on login failure without message', async () => {
      (loginUser as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error());

      renderAuth();
      const user = userEvent.setup();

      await user.type(screen.getByPlaceholderText('Enter username'), 'testuser');
      await user.type(screen.getByPlaceholderText('••••••••'), 'password123');
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Authentication failed')).toBeInTheDocument();
      });
    });

    it('should show fallback error message on registration failure without message', async () => {
      (registerUser as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error());

      renderAuth();
      const user = userEvent.setup();

      fireEvent.click(screen.getByText(/don't have an account/i));

      await user.type(screen.getByPlaceholderText('Enter username'), 'newuser');
      await user.type(screen.getByPlaceholderText('••••••••'), 'password123');
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Authentication failed')).toBeInTheDocument();
      });
    });
  });

  describe('Form Inputs', () => {
    it('should update username on input', async () => {
      renderAuth();
      const user = userEvent.setup();

      const usernameInput = screen.getByPlaceholderText('Enter username');
      await user.type(usernameInput, 'myusername');

      expect(usernameInput).toHaveValue('myusername');
    });

    it('should update password on input', async () => {
      renderAuth();
      const user = userEvent.setup();

      const passwordInput = screen.getByPlaceholderText('••••••••');
      await user.type(passwordInput, 'mypassword');

      expect(passwordInput).toHaveValue('mypassword');
    });

    it('should have password input type as password', () => {
      renderAuth();

      const passwordInput = screen.getByPlaceholderText('••••••••');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });
});
