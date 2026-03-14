// Standard loading container styles for consistent loading experience across the app

export const loadingStyles = {
  // Full page loading (initial app load)
  fullPage: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#f7fafc'
  },

  // Dashboard/page content loading (main content area)
  pageContent: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
    width: '100%'
  },

  // Section/component loading (smaller sections within a page)
  section: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '300px',
    width: '100%'
  },

  // Inline/small component loading (cards, lists)
  inline: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    width: '100%'
  }
};

// Standard spinner sizes
export const spinnerSizes = {
  large: 40,    // Full page loads
  medium: 36,   // Page content loads (default)
  small: 32     // Section/inline loads
};
