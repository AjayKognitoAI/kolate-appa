# Phase 3.2: React Optimization

## Objective
Apply React and Next.js performance optimizations based on the react-best-practices skill.

---

## Prompt

```
Using the react-best-practices skill and typescript-pro agent, optimize the React/Next.js frontend for performance.

## Source Location
`existing-architecture-codebase/frontend/src/`

## Tasks

### 1. Eliminate Render Waterfalls

#### Before (Waterfall)
```typescript
// Bad: Sequential data fetching
const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchUser().then(setUser);
  }, []);

  useEffect(() => {
    if (user) {
      fetchProjects(user.id).then(setProjects);
    }
  }, [user]);

  useEffect(() => {
    if (projects.length) {
      fetchStats(projects).then(setStats);
    }
  }, [projects]);
};
```

#### After (Parallel)
```typescript
// Good: Parallel data fetching
const Dashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [user, projects, stats] = await Promise.all([
        fetchUser(),
        fetchProjects(),
        fetchStats(),
      ]);
      return { user, projects, stats };
    },
  });
};
```

### 2. Optimize Re-renders

#### Use useMemo for Expensive Calculations
```typescript
// Before
const ProjectList = ({ projects, filter }) => {
  // Recalculated on every render
  const filteredProjects = projects.filter(p => p.status === filter);

  return <List items={filteredProjects} />;
};

// After
const ProjectList = ({ projects, filter }) => {
  const filteredProjects = useMemo(
    () => projects.filter(p => p.status === filter),
    [projects, filter]
  );

  return <List items={filteredProjects} />;
};
```

#### Use useCallback for Event Handlers
```typescript
// Before
const UserForm = ({ onSave }) => {
  // New function created on every render
  const handleSubmit = (data) => {
    onSave(data);
  };

  return <Form onSubmit={handleSubmit} />;
};

// After
const UserForm = ({ onSave }) => {
  const handleSubmit = useCallback((data) => {
    onSave(data);
  }, [onSave]);

  return <Form onSubmit={handleSubmit} />;
};
```

#### Use React.memo for Pure Components
```typescript
// Before
const ProjectCard = ({ project, onSelect }) => {
  return (
    <Card onClick={() => onSelect(project.id)}>
      <h3>{project.name}</h3>
      <p>{project.description}</p>
    </Card>
  );
};

// After
const ProjectCard = memo(({ project, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(project.id);
  }, [onSelect, project.id]);

  return (
    <Card onClick={handleClick}>
      <h3>{project.name}</h3>
      <p>{project.description}</p>
    </Card>
  );
});
```

### 3. Implement Code Splitting

#### Dynamic Imports for Routes
```typescript
// Before
import AdminDashboard from '@/components/admin/AdminDashboard';
import ProjectManager from '@/components/projects/ProjectManager';
import UserSettings from '@/components/users/UserSettings';

// After
const AdminDashboard = dynamic(() => import('@/components/admin/AdminDashboard'), {
  loading: () => <DashboardSkeleton />,
});

const ProjectManager = dynamic(() => import('@/components/projects/ProjectManager'), {
  loading: () => <ProjectSkeleton />,
});

const UserSettings = dynamic(() => import('@/components/users/UserSettings'), {
  loading: () => <SettingsSkeleton />,
});
```

#### Dynamic Import for Heavy Libraries
```typescript
// Before
import { Chart } from 'chart.js';

// After
const loadChart = () => import('chart.js').then(m => m.Chart);

const ChartComponent = () => {
  useEffect(() => {
    loadChart().then(Chart => {
      // Use Chart
    });
  }, []);
};
```

### 4. Optimize Images with next/image

```typescript
// Before
<img src="/logo.png" alt="Logo" />

// After
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority // for above-the-fold images
/>

// For dynamic images
<Image
  src={user.avatarUrl}
  alt={user.name}
  width={48}
  height={48}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

### 5. Implement Proper Suspense Boundaries

```typescript
// Before
const Dashboard = () => {
  const { data, isLoading } = useQuery(['data'], fetchData);

  if (isLoading) return <Loading />;

  return <Content data={data} />;
};

// After
const DashboardContent = () => {
  const { data } = useSuspenseQuery(['data'], fetchData);
  return <Content data={data} />;
};

const Dashboard = () => {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
};
```

### 6. Optimize List Rendering

#### Virtualization for Long Lists
```typescript
// Before - Renders all items
const UserList = ({ users }) => {
  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
};

// After - Virtualized list
import { useVirtualizer } from '@tanstack/react-virtual';

const UserList = ({ users }) => {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              transform: `translateY(${virtualRow.start}px)`,
              height: `${virtualRow.size}px`,
            }}
          >
            <UserCard user={users[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 7. Optimize State Management

#### Avoid Unnecessary Context Re-renders
```typescript
// Before - All consumers re-render on any change
const AppContext = createContext();

const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState([]);

  return (
    <AppContext.Provider value={{ user, theme, notifications, setUser, setTheme, setNotifications }}>
      {children}
    </AppContext.Provider>
  );
};

// After - Split contexts by update frequency
const UserContext = createContext();
const ThemeContext = createContext();
const NotificationContext = createContext();

// Even better - use Zustand or Jotai for atomic state
import { create } from 'zustand';

const useUserStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

const useThemeStore = create((set) => ({
  theme: 'light',
  setTheme: (theme) => set({ theme }),
}));
```

### 8. Optimize Bundle Size

#### Analyze and Reduce Bundle
```bash
# Add to package.json scripts
"analyze": "ANALYZE=true next build"

# Install analyzer
npm install @next/bundle-analyzer
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // config
});
```

#### Tree-Shake Imports
```typescript
// Before - Imports entire library
import _ from 'lodash';
const result = _.debounce(fn, 300);

// After - Import specific function
import debounce from 'lodash/debounce';
const result = debounce(fn, 300);

// Or use lodash-es for better tree-shaking
import { debounce } from 'lodash-es';
```

### 9. Implement Proper Caching

#### React Query Cache Configuration
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// For specific queries
const { data } = useQuery({
  queryKey: ['enterprises'],
  queryFn: fetchEnterprises,
  staleTime: 10 * 60 * 1000, // 10 minutes for less frequent data
});
```

### 10. Optimize CSS/Styling

#### Use CSS Modules or CSS-in-JS Efficiently
```typescript
// Prefer static styles over dynamic when possible
// Before
const Button = ({ color }) => (
  <button style={{ backgroundColor: color }}>Click</button>
);

// After - Use CSS variables
const Button = ({ colorVariant }) => (
  <button className={`btn btn-${colorVariant}`}>Click</button>
);

// CSS
.btn { background-color: var(--btn-bg); }
.btn-primary { --btn-bg: var(--color-primary); }
.btn-secondary { --btn-bg: var(--color-secondary); }
```

### 11. Performance Monitoring

```typescript
// Add performance monitoring
import { getCLS, getFID, getLCP, getFCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  console.log(metric);
  // Send to your analytics service
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getLCP(sendToAnalytics);
getFCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| LCP (Largest Contentful Paint) | < 2.5s |
| FID (First Input Delay) | < 100ms |
| CLS (Cumulative Layout Shift) | < 0.1 |
| TTI (Time to Interactive) | < 3.5s |
| Bundle Size (JS) | < 200KB gzipped |

---

## Deliverables
1. All render waterfalls eliminated
2. Memoization applied where beneficial
3. Code splitting implemented
4. Images optimized with next/image
5. Lists virtualized where appropriate
6. State management optimized
7. Bundle size reduced
8. Performance monitoring added
9. All Core Web Vitals targets met
```

---

## Next Step
After completing this prompt, proceed to [03-component-modernization.md](03-component-modernization.md)
