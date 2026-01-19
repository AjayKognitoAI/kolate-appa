# Phase 3.1: UI Audit

## Objective
Conduct a comprehensive audit of the current UI against web design guidelines to identify areas for improvement.

---

## Prompt

```
Using the web-design-guidelines skill and ui-ux-designer agent, conduct a comprehensive UI audit of the frontend application.

## Source Location
`existing-architecture-codebase/frontend/src/`

## Tasks

### 1. Accessibility Audit (WCAG 2.1 AA Compliance)

Review all components for accessibility issues:

#### Color Contrast
```
Checklist:
- [ ] Text has minimum 4.5:1 contrast ratio (normal text)
- [ ] Large text has minimum 3:1 contrast ratio
- [ ] UI components have minimum 3:1 contrast ratio
- [ ] Focus indicators are visible
- [ ] Color is not the only means of conveying information
```

#### Keyboard Navigation
```
Checklist:
- [ ] All interactive elements are keyboard accessible
- [ ] Focus order is logical and intuitive
- [ ] No keyboard traps exist
- [ ] Skip links are available
- [ ] Custom components have proper keyboard support
```

#### Screen Reader Support
```
Checklist:
- [ ] Images have appropriate alt text
- [ ] Form inputs have associated labels
- [ ] ARIA attributes are used correctly
- [ ] Headings follow logical hierarchy
- [ ] Live regions for dynamic content
- [ ] Error messages are announced
```

#### Forms
```
Checklist:
- [ ] All inputs have visible labels
- [ ] Required fields are indicated
- [ ] Error messages are descriptive and helpful
- [ ] Form submission errors are clearly communicated
- [ ] Autofill is properly supported
```

### 2. Performance Audit

Review components for performance issues:

#### Image Optimization
```
Checklist:
- [ ] Images use next/image for optimization
- [ ] Appropriate image formats (WebP, AVIF)
- [ ] Lazy loading implemented
- [ ] Responsive images with srcset
- [ ] Proper image dimensions specified
```

#### Component Loading
```
Checklist:
- [ ] Heavy components use dynamic imports
- [ ] Appropriate loading states
- [ ] Skeleton screens for content loading
- [ ] Error boundaries in place
- [ ] Suspense boundaries for async components
```

#### Animation Performance
```
Checklist:
- [ ] Animations use CSS transforms/opacity
- [ ] No layout thrashing
- [ ] Reduced motion preference respected
- [ ] Hardware acceleration where appropriate
- [ ] 60fps maintained during animations
```

### 3. UX Patterns Audit

Review user experience patterns:

#### Navigation
```
Checklist:
- [ ] Clear navigation structure
- [ ] Breadcrumbs for deep pages
- [ ] Current location indicated
- [ ] Mobile navigation is usable
- [ ] Search functionality works well
```

#### Feedback
```
Checklist:
- [ ] Loading states are clear
- [ ] Success/error feedback is visible
- [ ] Progress indicators for long operations
- [ ] Undo functionality where appropriate
- [ ] Confirmation for destructive actions
```

#### Forms & Input
```
Checklist:
- [ ] Inline validation
- [ ] Helpful placeholder text
- [ ] Input masks for formatted data
- [ ] Auto-save for long forms
- [ ] Clear error recovery paths
```

### 4. Component-by-Component Audit

For each major component, evaluate:

```typescript
// Audit template for each component
interface ComponentAudit {
  componentPath: string;
  accessibilityIssues: {
    severity: 'critical' | 'major' | 'minor';
    issue: string;
    recommendation: string;
    wcagCriteria?: string;
  }[];
  performanceIssues: {
    issue: string;
    impact: 'high' | 'medium' | 'low';
    recommendation: string;
  }[];
  uxIssues: {
    issue: string;
    recommendation: string;
  }[];
  modernizationOpportunities: string[];
}
```

#### Example Audit Output

```typescript
const sidebarAudit: ComponentAudit = {
  componentPath: 'src/components/layout/Sidebar.tsx',
  accessibilityIssues: [
    {
      severity: 'major',
      issue: 'Navigation items lack focus indicators',
      recommendation: 'Add visible focus styles using focus-visible',
      wcagCriteria: '2.4.7 Focus Visible',
    },
    {
      severity: 'minor',
      issue: 'Expand/collapse not announced to screen readers',
      recommendation: 'Add aria-expanded attribute',
      wcagCriteria: '4.1.2 Name, Role, Value',
    },
  ],
  performanceIssues: [
    {
      issue: 'Icons loaded synchronously',
      impact: 'medium',
      recommendation: 'Use dynamic imports for icon components',
    },
  ],
  uxIssues: [
    {
      issue: 'Active state not visually distinct enough',
      recommendation: 'Increase contrast between active and inactive states',
    },
  ],
  modernizationOpportunities: [
    'Convert to CSS-in-JS for better theming support',
    'Add collapsible sections for better organization',
    'Implement keyboard shortcuts for power users',
  ],
};
```

### 5. Design System Consistency Audit

Review for design system adherence:

```
Checklist:
- [ ] Consistent spacing scale used
- [ ] Typography scale followed
- [ ] Color palette adhered to
- [ ] Component patterns consistent
- [ ] Icon style consistent
- [ ] Border radius consistent
- [ ] Shadow usage consistent
- [ ] Animation timing consistent
```

### 6. Mobile Responsiveness Audit

Test at these breakpoints:
- 320px (small mobile)
- 375px (mobile)
- 768px (tablet)
- 1024px (small desktop)
- 1280px (desktop)
- 1536px (large desktop)

```
Checklist per breakpoint:
- [ ] Layout adapts appropriately
- [ ] Touch targets are 44x44px minimum
- [ ] Text remains readable
- [ ] Images scale properly
- [ ] Navigation is accessible
- [ ] Forms are usable
- [ ] Tables have mobile alternatives
```

### 7. Generate Audit Report

Create a comprehensive report:

```markdown
# UI/UX Audit Report - Kolate App Frontend

## Executive Summary
- Total components audited: X
- Critical issues: X
- Major issues: X
- Minor issues: X

## Accessibility Score: X/100
### Critical Issues
1. [Issue description and location]

### Major Issues
1. [Issue description and location]

## Performance Score: X/100
### High Impact Issues
1. [Issue description and location]

## UX Score: X/100
### Priority Improvements
1. [Issue description and location]

## Component-by-Component Results
[Detailed breakdown]

## Prioritized Recommendations
1. [Highest priority]
2. [Second priority]
...

## Implementation Timeline
### Phase 1 (Critical)
- Fix accessibility blockers
- Address performance bottlenecks

### Phase 2 (Important)
- UX improvements
- Design consistency

### Phase 3 (Enhancement)
- Modern UI patterns
- Advanced features
```

---

## Output Files

Create these audit output files:

1. `prompts/audit-results/accessibility-audit.md`
2. `prompts/audit-results/performance-audit.md`
3. `prompts/audit-results/ux-audit.md`
4. `prompts/audit-results/full-audit-report.md`

---

## Deliverables
1. Complete accessibility audit with WCAG references
2. Performance audit with metrics
3. UX patterns audit
4. Component-by-component audit results
5. Design system consistency review
6. Mobile responsiveness report
7. Prioritized improvement recommendations
```

---

## Next Step
After completing this prompt, proceed to [02-react-optimization.md](02-react-optimization.md)
