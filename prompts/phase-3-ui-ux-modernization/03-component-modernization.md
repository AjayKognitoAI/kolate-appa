# Phase 3.3: Component Modernization

## Objective
Modernize UI components with current design patterns and improved user experience.

---

## Prompt

```
Using the ui-ux-designer agent and react-best-practices skill, modernize the UI components for a better user experience.

## Source Location
`existing-architecture-codebase/frontend/src/components/`

## Tasks

### 1. Modernize Data Tables

#### Before (Basic Table)
```typescript
const BasicTable = ({ data }) => (
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      {data.map(row => (
        <tr key={row.id}>
          <td>{row.name}</td>
          <td>{row.email}</td>
          <td>{row.status}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
```

#### After (Modern Data Table)
```typescript
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';

const ModernDataTable = ({ data, loading }) => {
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar src={params.row.avatar} alt={params.value} />
          <Typography>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
    },
    {
      field: 'status',
      headerName: 'Status',
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === 'ACTIVE' ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      renderCell: (params) => (
        <IconButton onClick={() => handleEdit(params.row)}>
          <EditIcon />
        </IconButton>
      ),
    },
  ];

  return (
    <DataGrid
      rows={data}
      columns={columns}
      loading={loading}
      slots={{ toolbar: GridToolbar }}
      slotProps={{
        toolbar: {
          showQuickFilter: true,
          quickFilterProps: { debounceMs: 500 },
        },
      }}
      pageSizeOptions={[10, 25, 50]}
      initialState={{
        pagination: { paginationModel: { pageSize: 10 } },
      }}
      checkboxSelection
      disableRowSelectionOnClick
    />
  );
};
```

### 2. Modernize Forms

#### Before (Basic Form)
```typescript
const BasicForm = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name) setError('Name required');
    // ...
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={e => setName(e.target.value)} />
      <input value={email} onChange={e => setEmail(e.target.value)} />
      {error && <span>{error}</span>}
      <button type="submit">Submit</button>
    </form>
  );
};
```

#### After (Modern Form with React Hook Form)
```typescript
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  role: z.string().min(1, 'Please select a role'),
});

type FormData = z.infer<typeof schema>;

const ModernForm = ({ onSubmit, defaultValues }) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Name"
            error={!!errors.name}
            helperText={errors.name?.message}
            fullWidth
          />
        )}
      />

      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Email"
            type="email"
            error={!!errors.email}
            helperText={errors.email?.message}
            fullWidth
          />
        )}
      />

      <Controller
        name="role"
        control={control}
        render={({ field }) => (
          <FormControl fullWidth error={!!errors.role}>
            <InputLabel>Role</InputLabel>
            <Select {...field} label="Role">
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="manager">Manager</MenuItem>
              <MenuItem value="member">Member</MenuItem>
            </Select>
            {errors.role && <FormHelperText>{errors.role.message}</FormHelperText>}
          </FormControl>
        )}
      />

      <LoadingButton
        type="submit"
        variant="contained"
        loading={isSubmitting}
        loadingPosition="start"
        startIcon={<SaveIcon />}
      >
        Save
      </LoadingButton>
    </Box>
  );
};
```

### 3. Modernize Navigation

#### Add Breadcrumbs
```typescript
import { Breadcrumbs, Link, Typography } from '@mui/material';
import { usePathname } from 'next/navigation';

const ModernBreadcrumbs = () => {
  const pathname = usePathname();
  const paths = pathname.split('/').filter(Boolean);

  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
      <Link href="/" color="inherit">
        Home
      </Link>
      {paths.map((path, index) => {
        const href = `/${paths.slice(0, index + 1).join('/')}`;
        const isLast = index === paths.length - 1;
        const label = path.charAt(0).toUpperCase() + path.slice(1);

        return isLast ? (
          <Typography key={path} color="text.primary">
            {label}
          </Typography>
        ) : (
          <Link key={path} href={href} color="inherit">
            {label}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
};
```

#### Modernize Sidebar
```typescript
const ModernSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsed ? 64 : 240,
        transition: 'width 0.3s ease',
        '& .MuiDrawer-paper': {
          width: collapsed ? 64 : 240,
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
        <IconButton onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>

      <List>
        {menuItems.map((item) => (
          <Tooltip key={item.path} title={collapsed ? item.label : ''} placement="right">
            <ListItemButton
              component={Link}
              href={item.path}
              selected={pathname === item.path}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              {!collapsed && <ListItemText primary={item.label} />}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>
    </Drawer>
  );
};
```

### 4. Modernize Cards & Dashboards

#### Modern Dashboard Cards
```typescript
const StatsCard = ({ title, value, change, icon: Icon, trend }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography color="text.secondary" variant="overline">
            {title}
          </Typography>
          <Typography variant="h4" sx={{ my: 1 }}>
            {value}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {trend === 'up' ? (
              <TrendingUpIcon color="success" fontSize="small" />
            ) : (
              <TrendingDownIcon color="error" fontSize="small" />
            )}
            <Typography
              variant="body2"
              color={trend === 'up' ? 'success.main' : 'error.main'}
            >
              {change}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              vs last month
            </Typography>
          </Box>
        </Box>
        <Avatar sx={{ bgcolor: 'primary.light' }}>
          <Icon color="primary" />
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

const ModernDashboard = () => (
  <Grid container spacing={3}>
    <Grid item xs={12} sm={6} md={3}>
      <StatsCard
        title="Total Projects"
        value="24"
        change={12}
        icon={FolderIcon}
        trend="up"
      />
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <StatsCard
        title="Active Users"
        value="1,234"
        change={-5}
        icon={PeopleIcon}
        trend="down"
      />
    </Grid>
    {/* More cards */}
  </Grid>
);
```

### 5. Modernize Modals & Dialogs

```typescript
const ModernDialog = ({ open, onClose, title, children, actions }) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="sm"
    fullWidth
    TransitionComponent={Slide}
    TransitionProps={{ direction: 'up' }}
  >
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {title}
      <IconButton onClick={onClose} aria-label="close">
        <CloseIcon />
      </IconButton>
    </DialogTitle>
    <DialogContent dividers>{children}</DialogContent>
    <DialogActions sx={{ px: 3, py: 2 }}>{actions}</DialogActions>
  </Dialog>
);

// Confirmation dialog with better UX
const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmText = 'Confirm', danger = false }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <DialogContentText>{message}</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button
        onClick={onConfirm}
        color={danger ? 'error' : 'primary'}
        variant="contained"
        autoFocus
      >
        {confirmText}
      </Button>
    </DialogActions>
  </Dialog>
);
```

### 6. Add Loading States & Skeletons

```typescript
// Skeleton for table rows
const TableRowSkeleton = () => (
  <TableRow>
    <TableCell><Skeleton variant="circular" width={40} height={40} /></TableCell>
    <TableCell><Skeleton width="80%" /></TableCell>
    <TableCell><Skeleton width="60%" /></TableCell>
    <TableCell><Skeleton width={80} /></TableCell>
  </TableRow>
);

// Skeleton for cards
const CardSkeleton = () => (
  <Card>
    <CardContent>
      <Skeleton variant="text" width="40%" />
      <Skeleton variant="text" width="60%" height={40} />
      <Skeleton variant="text" width="80%" />
    </CardContent>
  </Card>
);

// Skeleton for dashboard
const DashboardSkeleton = () => (
  <Grid container spacing={3}>
    {[1, 2, 3, 4].map((i) => (
      <Grid item xs={12} sm={6} md={3} key={i}>
        <CardSkeleton />
      </Grid>
    ))}
  </Grid>
);
```

### 7. Modernize Notifications & Toasts

```typescript
import { SnackbarProvider, useSnackbar, SnackbarContent } from 'notistack';

// Custom notification component
const CustomNotification = forwardRef<HTMLDivElement, { id: string; message: string; variant: string }>(
  ({ id, message, variant }, ref) => {
    const { closeSnackbar } = useSnackbar();

    return (
      <SnackbarContent ref={ref}>
        <Alert
          severity={variant as AlertColor}
          onClose={() => closeSnackbar(id)}
          sx={{ width: '100%' }}
        >
          {message}
        </Alert>
      </SnackbarContent>
    );
  }
);

// Usage hook
const useNotification = () => {
  const { enqueueSnackbar } = useSnackbar();

  return {
    success: (message: string) => enqueueSnackbar(message, { variant: 'success' }),
    error: (message: string) => enqueueSnackbar(message, { variant: 'error' }),
    warning: (message: string) => enqueueSnackbar(message, { variant: 'warning' }),
    info: (message: string) => enqueueSnackbar(message, { variant: 'info' }),
  };
};
```

### 8. Add Dark Mode Support

```typescript
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';

const useThemeMode = () => {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedMode = localStorage.getItem('theme-mode') as 'light' | 'dark';
    if (savedMode) {
      setMode(savedMode);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setMode('dark');
    }
  }, []);

  const toggleMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('theme-mode', newMode);
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'dark'
            ? {
                background: {
                  default: '#121212',
                  paper: '#1e1e1e',
                },
              }
            : {}),
        },
      }),
    [mode]
  );

  return { theme, mode, toggleMode };
};

// Theme toggle component
const ThemeToggle = () => {
  const { mode, toggleMode } = useThemeMode();

  return (
    <IconButton onClick={toggleMode} aria-label="toggle theme">
      {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
    </IconButton>
  );
};
```

### 9. Add Micro-interactions

```typescript
// Button with ripple and loading state
const AnimatedButton = ({ loading, children, ...props }) => (
  <Button
    {...props}
    sx={{
      transition: 'all 0.2s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: 4,
      },
      '&:active': {
        transform: 'translateY(0)',
      },
    }}
    disabled={loading}
  >
    {loading ? <CircularProgress size={20} /> : children}
  </Button>
);

// Card with hover effect
const InteractiveCard = ({ children, onClick }) => (
  <Card
    onClick={onClick}
    sx={{
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.3s ease',
      '&:hover': onClick && {
        transform: 'translateY(-4px)',
        boxShadow: 6,
      },
    }}
  >
    {children}
  </Card>
);
```

---

## Components to Modernize Checklist

- [ ] Data tables with sorting, filtering, pagination
- [ ] Forms with validation and better UX
- [ ] Navigation (sidebar, breadcrumbs, tabs)
- [ ] Cards and dashboard widgets
- [ ] Modals and dialogs
- [ ] Loading states and skeletons
- [ ] Notifications and toasts
- [ ] Dark mode support
- [ ] Micro-interactions and animations
- [ ] Empty states
- [ ] Error states

---

## Deliverables
1. Modernized data table component
2. Form components with React Hook Form + Zod
3. Modern navigation components
4. Dashboard cards with trends
5. Dialog components
6. Skeleton loading components
7. Notification system
8. Dark mode implementation
9. Micro-interactions added
```

---

## Next Step
After completing this prompt, proceed to [04-accessibility-improvements.md](04-accessibility-improvements.md)
