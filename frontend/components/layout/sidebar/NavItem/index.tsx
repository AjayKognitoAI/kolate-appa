import React, { useContext } from "react";
import Link from "next/link";

// mui imports
import {
  ListItemIcon,
  List,
  styled,
  ListItemText,
  Chip,
  useTheme,
  Typography,
  ListItemButton,
  useMediaQuery,
  Theme,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { CustomizerContext } from "@/context/customizerContext";

type NavGroup = {
  [x: string]: any;
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any;
  href?: any;
  children?: NavGroup[];
  chip?: string;
  chipColor?: any;
  variant?: string | any;
  external?: boolean;
  level?: number;
  onClick?: React.MouseEvent<HTMLButtonElement, MouseEvent>;
  disabled?: boolean;
};

interface ItemType {
  item: NavGroup;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  hideMenu?: any;
  level?: number | any;
  pathDirect: string;
}

export default function NavItem({
  item,
  level,
  pathDirect,
  hideMenu,
  onClick,
}: ItemType) {
  const lgDown = useMediaQuery((theme: Theme) => theme.breakpoints.down("lg"));

  const { isBorderRadius } = useContext(CustomizerContext);

  const Icon = item?.icon;
  const theme = useTheme();
  const { t } = useTranslation();
  const itemIcon =
    level > 1 ? (
      <Icon stroke={1.5} size="1rem" />
    ) : (
      <Icon stroke={2.5} size="1.3rem" />
    );

  const isSelected =
    pathDirect === item?.href || pathDirect.startsWith(item?.href + "/");

  const ListItemStyled = styled(ListItemButton)(() => ({
    whiteSpace: "nowrap",
    marginBottom: "2px",
    padding: "6px 9px",
    height: "40px",
    borderRadius: "0px",
    backgroundColor: level > 1 ? "transparent !important" : "inherit",
    color:
      level > 1 && isSelected
        ? `${theme.palette.primary.dark}!important`
        : theme.palette.text.primary,
    paddingLeft: hideMenu ? "8px" : level > 2 ? `${level * 15}px` : "8px",
    borderLeft: "1px solid transparent",
    "&:hover": {
      backgroundColor: theme.palette.primary.light,
      color: theme.palette.primary.dark,
    },
    "&.Mui-selected": {
      color: theme.palette.primary.dark,
      backgroundColor: theme.palette.primary.light,
      borderLeft: `1px solid ${theme.palette.primary.dark}`,
      "&:hover": {
        backgroundColor: theme.palette.primary.light,
        color: theme.palette.primary.dark,
      },
    },
  }));

  const listItemProps: {
    component: any;
    href?: string;
    target?: any;
    to?: any;
  } = {
    component: item?.external ? "a" : Link,
    to: item?.href,
    href: item?.external ? item?.href : "",
    target: item?.external ? "_blank" : "",
  };

  return (
    <List component="li" disablePadding key={item?.id && item.title}>
      {/* Common item content */}
      {(() => {
        const itemContent = (
          <ListItemStyled
            disabled={item?.disabled}
            selected={isSelected}
            onClick={!item?.disabled && lgDown ? onClick : undefined}
          >
            <ListItemIcon
              sx={{
                minWidth: "36px",
                p: "3px 0",
                color:
                  level > 1 && isSelected
                    ? `${theme.palette.primary.main}!important`
                    : "inherit",
              }}
            >
              {itemIcon}
            </ListItemIcon>
            <ListItemText>
              {hideMenu ? "" : <>{t(`${item?.title}`)}</>}
              <br />
              {item?.subtitle ? (
                <Typography variant="caption">
                  {hideMenu ? "" : item?.subtitle}
                </Typography>
              ) : (
                ""
              )}
            </ListItemText>

            {!item?.chip || hideMenu ? null : (
              <Chip
                color={item?.chipColor}
                variant={item?.variant ? item?.variant : "filled"}
                size="small"
                label={item?.chip}
              />
            )}
          </ListItemStyled>
        );

        // Conditionally wrap with Link or plain div
        return item?.disabled ? <div>{itemContent}</div> : <Link href={item.href}>{itemContent}</Link>;
      })()}
    </List>
  );
}
