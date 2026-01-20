"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Popper,
  ClickAwayListener,
  Fade,
  CircularProgress,
} from "@mui/material";
import {
  IconChevronDown,
  IconChevronRight,
  IconBulb,
  IconChartBar,
  IconRobot,
  IconCircleOff,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import trialsService from "@/services/admin/trials-service";

type Item = {
  id: string;
  label: string;
  disabled?: boolean;
};

type Category = {
  id: string;
  label: string;
  icon: any;
  children: Item[];
};

// Icon mapping for modules
const MODULE_ICONS: Record<string, any> = {
  none: IconCircleOff,
  predict: IconBulb,
  compare: IconChartBar,
  insights: IconChartBar,
  copilot: IconRobot,
};

interface NestedDropdownProps {
  onChange?: (category: string, value: string) => void;
}

export default function NestedDropdown({ onChange }: NestedDropdownProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<{ category: string; item: string } | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<Category[]>([
    {
      id: "none",
      label: "None",
      icon: IconCircleOff,
      children: [],
    },
  ]);
  const [loading, setLoading] = useState(true);

  // Fetch modules and trials from API
  useEffect(() => {
    const fetchModulesAndTrials = async () => {
      try {
        setLoading(true);
        const orgId = session?.user?.orgId;

        if (!orgId) {
          console.error("Organization ID not found in session");
          setLoading(false);
          return;
        }

        const response = await trialsService.getEnterpriseAccess(orgId);

        if (response.state === "success" && response.data) {
          // Transform API response to categories format
          const fetchedCategories: Category[] = [
            {
              id: "none",
              label: "None",
              icon: IconCircleOff,
              children: [],
            },
          ];

          response.data.forEach((module) => {
            const icon = MODULE_ICONS[module.slug.toLowerCase()] || IconBulb;

            // Transform trials to items
            const children: Item[] = module.trials.map((trial) => ({
              id: trial.slug,
              label: trial.name,
              disabled: false,
            }));

            fetchedCategories.push({
              id: module.slug,
              label: module.name,
              icon,
              children: module.is_standalone ? [] : children,
            });
          });

          setCategories(fetchedCategories);
        }
      } catch (error) {
        console.error("Failed to fetch modules and trials:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.orgId) {
      fetchModulesAndTrials();
    }
  }, [session?.user?.orgId]);

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  const handleClose = () => {
    setOpen(false);
    setExpandedCategory(null);
  };

  const handleCategoryClick = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);

    // If category has no children, select it directly
    if (!category?.children || category.children.length === 0) {
      setSelectedValue({ category: categoryId, item: categoryId });
      onChange?.(categoryId, categoryId);
      handleClose();
      return;
    }

    // Toggle expansion
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const handleItemClick = (categoryId: string, itemId: string, disabled?: boolean) => {
    if (disabled) return;

    setSelectedValue({ category: categoryId, item: itemId });
    onChange?.(categoryId, itemId);
    handleClose();
  };

  const getDisplayText = () => {
    if (!selectedValue) return "-- Select Type --";

    const category = categories.find((c) => c.id === selectedValue.category);
    if (!category) return "-- Select Type --";

    // For categories without children (like Copilot)
    if (selectedValue.category === selectedValue.item) {
      return category.label;
    }

    const item = category.children?.find((i) => i.id === selectedValue.item);
    return item ? `${category.label} > ${item.label}` : category.label;
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 400 }}>
      <Typography
        variant="subtitle2"
        fontWeight={600}
        sx={{ mb: 1, color: "text.primary" }}
      >
        Select Study
      </Typography>

      {/* Dropdown Trigger */}
      <Box
        ref={anchorRef}
        onClick={handleToggle}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          border: "1px solid",
          borderColor: open ? "primary.main" : "divider",
          borderRadius: 1,
          cursor: "pointer",
          bgcolor: "background.paper",
          transition: "all 0.2s ease",
          "&:hover": {
            borderColor: "primary.main",
            bgcolor: "action.hover",
          },
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: selectedValue ? "text.primary" : "text.secondary",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {getDisplayText()}
        </Typography>
        <IconChevronDown
          size={18}
          style={{
            transition: "transform 0.2s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </Box>

      {/* Dropdown Menu */}
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        transition
        sx={{ zIndex: 1300, width: anchorRef.current?.offsetWidth || 400 }}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={200}>
            <Paper
              elevation={8}
              sx={{
                mt: 0.5,
                borderRadius: 1,
                overflow: "hidden",
                maxHeight: 400,
                overflowY: "auto",
              }}
            >
              <ClickAwayListener onClickAway={handleClose}>
                <List disablePadding>
                  {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : (
                    categories.map((category) => {
                    const Icon = category.icon;
                    const isExpanded = expandedCategory === category.id;
                    const hasChildren = category.children && category.children.length > 0;

                    return (
                      <React.Fragment key={category.id}>
                        {/* Category Item */}
                        <ListItemButton
                          onClick={() => handleCategoryClick(category.id)}
                          sx={{
                            py: 1.5,
                            px: 2,
                            bgcolor: isExpanded ? "action.selected" : "transparent",
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <Icon size={20} />
                          </ListItemIcon>
                          <ListItemText
                            primary={category.label}
                            primaryTypographyProps={{
                              variant: "body2",
                              fontWeight: 500,
                            }}
                          />
                          {hasChildren && (
                            <IconChevronRight
                              size={16}
                              style={{
                                transition: "transform 0.2s ease",
                                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                              }}
                            />
                          )}
                        </ListItemButton>

                        {/* Nested Items */}
                        {hasChildren && (
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <List disablePadding sx={{ bgcolor: "action.hover" }}>
                              {category.children.map((item) => (
                                <ListItemButton
                                  key={item.id}
                                  onClick={() =>
                                    handleItemClick(category.id, item.id, item.disabled)
                                  }
                                  disabled={item.disabled}
                                  sx={{
                                    py: 1,
                                    pl: 6,
                                    pr: 2,
                                    "&:hover": {
                                      bgcolor: "action.focus",
                                    },
                                    "&.Mui-disabled": {
                                      opacity: 0.6,
                                    },
                                  }}
                                >
                                  <ListItemText
                                    primary={item.label}
                                    primaryTypographyProps={{
                                      variant: "body2",
                                      color: item.disabled ? "text.disabled" : "text.primary",
                                      fontStyle: item.disabled ? "italic" : "normal",
                                    }}
                                  />
                                </ListItemButton>
                              ))}
                            </List>
                          </Collapse>
                        )}
                      </React.Fragment>
                    );
                  })
                  )}
                </List>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </Box>
  );
}

// Also export with old name for backward compatibility
export { NestedDropdown as PredictDropdown };
