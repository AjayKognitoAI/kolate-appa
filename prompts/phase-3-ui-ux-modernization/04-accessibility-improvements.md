# Phase 3.4: Accessibility Improvements

## Objective
Implement accessibility improvements to achieve WCAG 2.1 AA compliance.

---

## Prompt

```
Using the web-design-guidelines skill and ui-ux-designer agent, implement accessibility improvements based on the audit findings.

## Source Location
`existing-architecture-codebase/frontend/src/`

## Tasks

### 1. Fix Focus Management

#### Visible Focus Indicators
```typescript
// Create a global focus style
// styles/globals.css
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Remove default outline only when not using keyboard */
:focus:not(:focus-visible) {
  outline: none;
}

// Or with MUI theme
const theme = createTheme({
  components: {
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '2px solid #1976d2',
            outlineOffset: '2px',
          },
        },
      },
    },
  },
});
```

#### Focus Trap for Modals
```typescript
import { FocusTrap } from '@mui/base/FocusTrap';

const AccessibleModal = ({ open, onClose, children }) => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} onKeyDown={handleKeyDown}>
      <FocusTrap open={open}>
        <div tabIndex={-1}>
          {children}
        </div>
      </FocusTrap>
    </Dialog>
  );
};
```

#### Skip Links
```typescript
// Add to layout
const SkipLinks = () => (
  <Box
    component="nav"
    aria-label="Skip links"
    sx={{
      position: 'absolute',
      top: '-100%',
      '&:focus-within': {
        top: 0,
        zIndex: 9999,
      },
    }}
  >
    <Link
      href="#main-content"
      sx={{
        display: 'block',
        p: 2,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        '&:focus': {
          outline: '2px solid white',
        },
      }}
    >
      Skip to main content
    </Link>
    <Link
      href="#main-nav"
      sx={{
        display: 'block',
        p: 2,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
      }}
    >
      Skip to navigation
    </Link>
  </Box>
);

// In main content
<main id="main-content" tabIndex={-1}>
  {/* Content */}
</main>
```

### 2. Improve Screen Reader Support

#### Proper ARIA Labels
```typescript
// Before
<IconButton onClick={handleDelete}>
  <DeleteIcon />
</IconButton>

// After
<IconButton
  onClick={handleDelete}
  aria-label={`Delete ${itemName}`}
>
  <DeleteIcon />
</IconButton>

// For status indicators
<Chip
  label={status}
  color={status === 'ACTIVE' ? 'success' : 'default'}
  aria-label={`Status: ${status}`}
/>
```

#### Live Regions for Dynamic Content
```typescript
// For notifications
const NotificationArea = ({ notifications }) => (
  <Box
    role="status"
    aria-live="polite"
    aria-atomic="true"
    sx={{ position: 'absolute', clip: 'rect(0 0 0 0)' }}
  >
    {notifications.map((n) => (
      <span key={n.id}>{n.message}</span>
    ))}
  </Box>
);

// For loading states
const LoadingAnnouncer = ({ isLoading }) => (
  <Box role="status" aria-live="polite" sx={{ srOnly: true }}>
    {isLoading ? 'Loading...' : 'Content loaded'}
  </Box>
);

// For form errors
const FormErrorAnnouncer = ({ errors }) => (
  <Box role="alert" aria-live="assertive" sx={{ srOnly: true }}>
    {Object.values(errors).length > 0 && (
      `Form has ${Object.values(errors).length} errors. ${Object.values(errors).join('. ')}`
    )}
  </Box>
);
```

#### Proper Heading Hierarchy
```typescript
// Create a heading component that ensures hierarchy
const Heading = ({ level, children, ...props }) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <Typography
      component={Tag}
      variant={level === 1 ? 'h4' : level === 2 ? 'h5' : 'h6'}
      {...props}
    >
      {children}
    </Typography>
  );
};

// Page structure
const Page = () => (
  <>
    <Heading level={1}>Dashboard</Heading>
    <section aria-labelledby="projects-heading">
      <Heading level={2} id="projects-heading">Projects</Heading>
      {/* Project content */}
    </section>
    <section aria-labelledby="users-heading">
      <Heading level={2} id="users-heading">Users</Heading>
      {/* User content */}
    </section>
  </>
);
```

### 3. Improve Form Accessibility

#### Accessible Form Fields
```typescript
const AccessibleTextField = ({ id, label, error, helperText, required, ...props }) => {
  const errorId = error ? `${id}-error` : undefined;
  const helperId = helperText ? `${id}-helper` : undefined;

  return (
    <FormControl error={!!error} required={required} fullWidth>
      <InputLabel htmlFor={id}>{label}</InputLabel>
      <Input
        id={id}
        aria-describedby={[errorId, helperId].filter(Boolean).join(' ') || undefined}
        aria-invalid={!!error}
        aria-required={required}
        {...props}
      />
      {helperText && (
        <FormHelperText id={helperId}>{helperText}</FormHelperText>
      )}
      {error && (
        <FormHelperText id={errorId} error>
          {error}
        </FormHelperText>
      )}
    </FormControl>
  );
};
```

#### Accessible Select
```typescript
const AccessibleSelect = ({ id, label, options, error, required, ...props }) => (
  <FormControl error={!!error} required={required} fullWidth>
    <InputLabel id={`${id}-label`}>{label}</InputLabel>
    <Select
      labelId={`${id}-label`}
      id={id}
      label={label}
      aria-describedby={error ? `${id}-error` : undefined}
      {...props}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </Select>
    {error && (
      <FormHelperText id={`${id}-error`} error>
        {error}
      </FormHelperText>
    )}
  </FormControl>
);
```

#### Error Summary
```typescript
const FormErrorSummary = ({ errors }) => {
  if (Object.keys(errors).length === 0) return null;

  return (
    <Alert
      severity="error"
      role="alert"
      tabIndex={-1}
      ref={(el) => el?.focus()}
    >
      <AlertTitle>Please correct the following errors:</AlertTitle>
      <ul>
        {Object.entries(errors).map(([field, error]) => (
          <li key={field}>
            <a href={`#${field}`}>{error.message}</a>
          </li>
        ))}
      </ul>
    </Alert>
  );
};
```

### 4. Improve Color Contrast

```typescript
// Theme with accessible colors
const accessibleTheme = createTheme({
  palette: {
    primary: {
      main: '#1565c0', // 4.5:1 contrast on white
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#7b1fa2', // 4.5:1 contrast on white
      contrastText: '#ffffff',
    },
    error: {
      main: '#c62828', // 4.5:1 contrast on white
    },
    success: {
      main: '#2e7d32', // 4.5:1 contrast on white
    },
    text: {
      primary: '#212121', // High contrast
      secondary: '#616161', // 4.5:1 on white
    },
  },
});

// Don't rely solely on color
const StatusIndicator = ({ status }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        bgcolor: status === 'active' ? 'success.main' : 'error.main',
      }}
      aria-hidden="true"
    />
    <Typography>
      {status === 'active' ? 'Active' : 'Inactive'}
    </Typography>
  </Box>
);
```

### 5. Implement Reduced Motion

```typescript
// Respect user preference
const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
};

// Usage
const AnimatedComponent = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <Box
      sx={{
        transition: prefersReducedMotion ? 'none' : 'all 0.3s ease',
        animation: prefersReducedMotion ? 'none' : 'fadeIn 0.5s',
      }}
    >
      Content
    </Box>
  );
};

// Or in CSS
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 6. Make Tables Accessible

```typescript
const AccessibleTable = ({ data, columns, caption }) => (
  <TableContainer component={Paper}>
    <Table aria-label={caption}>
      <caption style={{ captionSide: 'top', textAlign: 'left', padding: '16px' }}>
        {caption}
      </caption>
      <TableHead>
        <TableRow>
          {columns.map((column) => (
            <TableCell
              key={column.id}
              scope="col"
              aria-sort={column.sorted ? (column.sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
            >
              {column.sortable ? (
                <TableSortLabel
                  active={column.sorted}
                  direction={column.sortDirection}
                  onClick={() => column.onSort()}
                >
                  {column.label}
                  <Box component="span" sx={{ srOnly: true }}>
                    {column.sorted
                      ? `sorted ${column.sortDirection === 'asc' ? 'ascending' : 'descending'}`
                      : 'click to sort'}
                  </Box>
                </TableSortLabel>
              ) : (
                column.label
              )}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((row, index) => (
          <TableRow key={row.id}>
            {columns.map((column, colIndex) => (
              <TableCell
                key={column.id}
                scope={colIndex === 0 ? 'row' : undefined}
              >
                {row[column.id]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);
```

### 7. Keyboard Navigation

```typescript
// Roving tabindex for tab list
const AccessibleTabs = ({ tabs, activeTab, onChange }) => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = (event: KeyboardEvent) => {
    const tabCount = tabs.length;
    let newIndex = focusedIndex;

    switch (event.key) {
      case 'ArrowRight':
        newIndex = (focusedIndex + 1) % tabCount;
        break;
      case 'ArrowLeft':
        newIndex = (focusedIndex - 1 + tabCount) % tabCount;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = tabCount - 1;
        break;
      default:
        return;
    }

    setFocusedIndex(newIndex);
    event.preventDefault();
  };

  return (
    <Box role="tablist" aria-label="Navigation tabs" onKeyDown={handleKeyDown}>
      {tabs.map((tab, index) => (
        <Button
          key={tab.id}
          role="tab"
          id={`tab-${tab.id}`}
          aria-controls={`panel-${tab.id}`}
          aria-selected={activeTab === tab.id}
          tabIndex={focusedIndex === index ? 0 : -1}
          onClick={() => onChange(tab.id)}
          ref={(el) => {
            if (focusedIndex === index) el?.focus();
          }}
        >
          {tab.label}
        </Button>
      ))}
    </Box>
  );
};
```

### 8. Testing Accessibility

```typescript
// Jest + Testing Library accessibility tests
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Component Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<MyComponent />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should be keyboard navigable', () => {
    render(<MyComponent />);

    const button = screen.getByRole('button');
    button.focus();
    expect(button).toHaveFocus();

    fireEvent.keyDown(button, { key: 'Enter' });
    // Assert action was triggered
  });

  it('should announce changes to screen readers', () => {
    render(<MyComponent />);

    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toBeInTheDocument();
  });
});
```

---

## Accessibility Checklist

### Perceivable
- [ ] Text alternatives for images
- [ ] Captions for videos
- [ ] Content adaptable (works with assistive tech)
- [ ] Distinguishable (color contrast, resize text)

### Operable
- [ ] Keyboard accessible
- [ ] Enough time to read/use content
- [ ] No content that causes seizures
- [ ] Navigable (skip links, focus order, page titles)

### Understandable
- [ ] Readable (language of page)
- [ ] Predictable (consistent navigation)
- [ ] Input assistance (error prevention, help)

### Robust
- [ ] Compatible with assistive technologies
- [ ] Valid HTML
- [ ] Name, role, value for all UI components

---

## Deliverables
1. Focus management improvements
2. Screen reader enhancements
3. Accessible form components
4. Color contrast fixes
5. Reduced motion support
6. Accessible tables
7. Keyboard navigation
8. Accessibility tests
9. WCAG 2.1 AA compliance verification
```

---

## Migration Complete!

After completing all phases, you will have:
1. A consolidated FastAPI backend replacing all microservices
2. Updated frontend connecting to the new backend
3. Modernized UI/UX with accessibility compliance

Refer to the [README](../README.md) for the complete migration overview.
