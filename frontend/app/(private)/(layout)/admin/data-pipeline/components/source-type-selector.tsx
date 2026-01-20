"use client"

import React from "react"
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Avatar,
} from "@mui/material"
import {
  IconLink,
  IconHeartbeat,
  IconFolderOpen,
  IconSpider,
  IconApi,
} from "@tabler/icons-react"

export type SourceType = "url" | "physionet" | "directory" | "crawl" | "api"

interface SourceTypeOption {
  id: SourceType
  title: string
  description: string
  icon: React.ReactNode
  color: string
}

const SOURCE_TYPES: SourceTypeOption[] = [
  {
    id: "url",
    title: "Direct URL",
    description: "Download files from direct URLs",
    icon: <IconLink size={28} />,
    color: "#1976d2",
  },
  {
    id: "physionet",
    title: "PhysioNet",
    description: "Medical research datasets",
    icon: <IconHeartbeat size={28} />,
    color: "#e91e63",
  },
  {
    id: "directory",
    title: "Directory",
    description: "Apache/Nginx listings",
    icon: <IconFolderOpen size={28} />,
    color: "#ff9800",
  },
  {
    id: "crawl",
    title: "Web Crawl",
    description: "Crawl & download files",
    icon: <IconSpider size={28} />,
    color: "#9c27b0",
  },
  {
    id: "api",
    title: "REST API",
    description: "Paginated API data",
    icon: <IconApi size={28} />,
    color: "#2196f3",
  },
]

interface SourceTypeSelectorProps {
  selectedType: SourceType | null
  onSelect: (type: SourceType) => void
}

export default function SourceTypeSelector({ selectedType, onSelect }: SourceTypeSelectorProps) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
        Choose Data Source Type
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr 1fr",
            sm: "repeat(3, 1fr)",
            md: "repeat(5, 1fr)",
          },
          gap: 2,
        }}
      >
        {SOURCE_TYPES.map((source) => (
          <Card
            key={source.id}
            sx={{
              border: 2,
              borderColor: selectedType === source.id ? source.color : "divider",
              bgcolor: selectedType === source.id ? `${source.color}10` : "background.paper",
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: source.color,
                bgcolor: `${source.color}08`,
              },
            }}
          >
            <CardActionArea
              onClick={() => onSelect(source.id)}
              sx={{ p: 1.5, height: "100%" }}
            >
              <CardContent sx={{ textAlign: "center", p: "8px !important" }}>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: selectedType === source.id ? source.color : "grey.200",
                    color: selectedType === source.id ? "white" : source.color,
                    mx: "auto",
                    mb: 1,
                    transition: "all 0.2s ease",
                  }}
                >
                  {source.icon}
                </Avatar>
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  sx={{
                    color: selectedType === source.id ? source.color : "text.primary",
                  }}
                >
                  {source.title}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", fontSize: "0.7rem" }}
                >
                  {source.description}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  )
}
