"use client";
import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Box, Typography, Link as MuiLink, Skeleton } from "@mui/material";
import { styled } from "@mui/material/styles";
import { privateAxios } from "@/utils/axios";

interface MarkdownRendererProps {
  content: string;
  baseImageUrl?: string;
}

// Pattern to detect API visualization URLs that require authentication
const AUTH_IMAGE_URL_PATTERN = /^https:\/\/.*\/visualizations\//;

// Check if a URL requires authentication
const requiresAuth = (url: string): boolean => {
  return AUTH_IMAGE_URL_PATTERN.test(url);
};

// AuthenticatedImage component for images that need auth headers
interface AuthenticatedImageProps {
  src: string;
  alt: string;
}

const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({ src, alt }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(false);

        const response = await privateAxios.get(src, {
          responseType: "blob",
          timeout: 60000,
        });

        if (isMounted) {
          objectUrl = URL.createObjectURL(response.data);
          setImageSrc(objectUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load authenticated image:", err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (loading) {
    return (
      <Skeleton
        variant="rectangular"
        sx={{
          width: "100%",
          maxWidth: 400,
          height: 200,
          borderRadius: "8px",
          my: 1,
        }}
      />
    );
  }

  if (error || !imageSrc) {
    return null;
  }

  return (
    <Box
      component="img"
      src={imageSrc}
      alt={alt}
      sx={{
        maxWidth: "100%",
        height: "auto",
        borderRadius: "8px",
        my: 1,
      }}
    />
  );
};

const MarkdownContainer = styled(Box)(({ theme }) => ({
  "& h1, & h2, & h3, & h4, & h5, & h6": {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  "& h1": {
    fontSize: "1.5rem",
  },
  "& h2": {
    fontSize: "1.25rem",
  },
  "& h3": {
    fontSize: "1.1rem",
  },
  "& h4, & h5, & h6": {
    fontSize: "1rem",
  },
  "& p": {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    lineHeight: 1.7,
    color: theme.palette.text.primary,
  },
  "& ul, & ol": {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    paddingLeft: theme.spacing(3),
  },
  "& li": {
    marginBottom: theme.spacing(0.5),
    lineHeight: 1.6,
  },
  "& strong": {
    fontWeight: 600,
  },
  "& code": {
    backgroundColor: theme.palette.grey[100],
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "0.875em",
    fontFamily: "monospace",
  },
  "& pre": {
    backgroundColor: theme.palette.grey[100],
    padding: theme.spacing(2),
    borderRadius: "8px",
    overflow: "auto",
    "& code": {
      backgroundColor: "transparent",
      padding: 0,
    },
  },
  "& blockquote": {
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    margin: theme.spacing(2, 0),
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.grey[50],
    borderRadius: "0 8px 8px 0",
  },
  "& table": {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  "& th, & td": {
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(1),
    textAlign: "left",
  },
  "& th": {
    backgroundColor: theme.palette.grey[100],
    fontWeight: 600,
  },
  "& hr": {
    border: "none",
    borderTop: `1px solid ${theme.palette.divider}`,
    margin: theme.spacing(2, 0),
  },
  "& img": {
    maxWidth: "100%",
    height: "auto",
    borderRadius: "8px",
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  "& a": {
    color: theme.palette.primary.main,
    textDecoration: "none",
    "&:hover": {
      textDecoration: "underline",
    },
  },
  // KaTeX math styles
  "& .katex-display": {
    margin: theme.spacing(2, 0),
    overflow: "auto",
  },
  "& .katex": {
    fontSize: "1.1em",
  },
}));

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  baseImageUrl,
}) => {
  // Process the content to fix image URLs if baseImageUrl is provided
  const processedContent = React.useMemo(() => {
    if (!baseImageUrl) return content;

    // Replace relative image paths with full URLs
    // Matches markdown image syntax: ![alt](url)
    return content.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      (match, alt, url) => {
        // If URL starts with http, leave it as is
        if (url.startsWith("http://") || url.startsWith("https://")) {
          return match;
        }
        // Otherwise, prepend the base URL
        const fullUrl = `${baseImageUrl}/${url.replace(/^\//, "")}`;
        return `![${alt}](${fullUrl})`;
      }
    );
  }, [content, baseImageUrl]);

  return (
    <MarkdownContainer>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Custom rendering for links to open in new tab
          a: ({ href, children, ...props }) => (
            <MuiLink
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </MuiLink>
          ),
          // Custom image rendering with error handling and auth support
          img: ({ src, alt, ...props }) => {
            const imgSrc = typeof src === "string" ? src : "";
            const imgAlt = alt || "";

            // Use authenticated image component for URLs that require auth
            if (requiresAuth(imgSrc)) {
              return <AuthenticatedImage src={imgSrc} alt={imgAlt} />;
            }

            // Regular image for public URLs
            return (
              <Box
                component="img"
                src={imgSrc}
                alt={imgAlt}
                sx={{
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: "8px",
                  my: 1,
                }}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  // Hide broken images
                  e.currentTarget.style.display = "none";
                }}
                {...props}
              />
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </MarkdownContainer>
  );
};

export default MarkdownRenderer;
