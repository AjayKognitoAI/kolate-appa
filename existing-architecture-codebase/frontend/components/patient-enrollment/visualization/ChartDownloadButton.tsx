"use client"

import { useState, useCallback } from "react"
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material"
import {
  Download,
  Image as ImageIcon,
  Code as SvgIcon,
} from "@mui/icons-material"

interface ChartDownloadButtonProps {
  chartRef: React.RefObject<HTMLDivElement | null>
  filename: string
  onDownload?: (format: "png" | "svg") => void
}

// Helper function to copy computed styles from original element to cloned element
function copyComputedStyles(original: Element, clone: Element) {
  const computedStyle = window.getComputedStyle(original)
  const styleProps = [
    "fill",
    "stroke",
    "stroke-width",
    "opacity",
    "font-family",
    "font-size",
    "font-weight",
    "text-anchor",
    "dominant-baseline",
    "fill-opacity",
    "stroke-opacity",
  ]

  styleProps.forEach((prop) => {
    const value = computedStyle.getPropertyValue(prop)
    if (value && value !== "none" && value !== "") {
      clone.setAttribute(prop, value)
    }
  })
}

// Recursively process elements and copy styles from original to clone
function inlineStylesFromOriginal(original: Element, clone: Element) {
  copyComputedStyles(original, clone)

  // Get children of both elements
  const originalChildren = Array.from(original.children)
  const cloneChildren = Array.from(clone.children)

  // Process matching children
  for (let i = 0; i < Math.min(originalChildren.length, cloneChildren.length); i++) {
    inlineStylesFromOriginal(originalChildren[i], cloneChildren[i])
  }
}

// Clone SVG and inline all styles for proper export
function cloneSvgWithStyles(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement

  // Set explicit dimensions
  const bbox = svg.getBoundingClientRect()
  clone.setAttribute("width", String(bbox.width))
  clone.setAttribute("height", String(bbox.height))

  // Add white background
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect")
  bg.setAttribute("width", "100%")
  bg.setAttribute("height", "100%")
  bg.setAttribute("fill", "#ffffff")
  clone.insertBefore(bg, clone.firstChild)

  // Copy computed styles from original SVG elements to cloned elements
  // This preserves the actual colors since computed styles work on the original (in-DOM) elements
  inlineStylesFromOriginal(svg, clone)

  // Get all original elements and clone elements for direct matching
  const originalElements = svg.querySelectorAll("*")
  const cloneElements = clone.querySelectorAll("*")

  // Process elements that have fill/stroke - ensure colors are captured
  for (let i = 0; i < Math.min(originalElements.length, cloneElements.length); i++) {
    const origEl = originalElements[i]
    const cloneEl = cloneElements[i]
    const computedStyle = window.getComputedStyle(origEl)

    // For shape elements (rect, path, circle, etc.), ensure fill color is captured
    const shapeElements = ["rect", "path", "circle", "ellipse", "polygon", "line"]
    if (shapeElements.includes(origEl.tagName.toLowerCase())) {
      // Get the computed fill color (this resolves CSS classes and variables)
      const fillColor = computedStyle.fill
      if (fillColor && fillColor !== "none") {
        cloneEl.setAttribute("fill", fillColor)
      }

      const strokeColor = computedStyle.stroke
      if (strokeColor && strokeColor !== "none") {
        cloneEl.setAttribute("stroke", strokeColor)
      }
    }

    // Ensure text is visible
    if (origEl.tagName === "text" || origEl.tagName === "tspan") {
      const fillColor = computedStyle.fill
      if (fillColor && fillColor !== "none" && fillColor !== "transparent") {
        cloneEl.setAttribute("fill", fillColor)
      } else {
        cloneEl.setAttribute("fill", "#374151")
      }
    }
  }

  return clone
}

export function ChartDownloadButton({
  chartRef,
  filename,
  onDownload,
}: ChartDownloadButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const downloadAsPNG = useCallback(async () => {
    if (!chartRef.current) return

    const svg = chartRef.current.querySelector("svg")
    if (!svg) return

    try {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Clone and inline styles
      const clonedSvg = cloneSvgWithStyles(svg as SVGSVGElement)

      // Serialize with proper encoding
      const svgData = new XMLSerializer().serializeToString(clonedSvg)
      const svgBase64 = btoa(unescape(encodeURIComponent(svgData)))
      const dataUrl = `data:image/svg+xml;base64,${svgBase64}`

      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = () => {
        // 2x resolution for better quality
        const width = svg.clientWidth || 400
        const height = svg.clientHeight || 300
        canvas.width = width * 2
        canvas.height = height * 2
        ctx.scale(2, 2)

        // White background
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, width, height)

        // Draw the image
        ctx.drawImage(img, 0, 0, width, height)

        const pngUrl = canvas.toDataURL("image/png", 1.0)
        const downloadLink = document.createElement("a")
        downloadLink.download = `${filename}.png`
        downloadLink.href = pngUrl
        downloadLink.click()

        onDownload?.("png")
      }

      img.onerror = (error) => {
        console.error("Failed to load SVG image:", error)
      }

      img.src = dataUrl
    } catch (error) {
      console.error("Failed to download PNG:", error)
    }

    handleClose()
  }, [chartRef, filename, onDownload])

  const downloadAsSVG = useCallback(() => {
    if (!chartRef.current) return

    const svg = chartRef.current.querySelector("svg")
    if (!svg) return

    try {
      // Clone and inline styles for proper export
      const clonedSvg = cloneSvgWithStyles(svg as SVGSVGElement)
      const svgData = new XMLSerializer().serializeToString(clonedSvg)
      const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
      const url = URL.createObjectURL(blob)

      const downloadLink = document.createElement("a")
      downloadLink.download = `${filename}.svg`
      downloadLink.href = url
      downloadLink.click()

      URL.revokeObjectURL(url)
      onDownload?.("svg")
    } catch (error) {
      console.error("Failed to download SVG:", error)
    }

    handleClose()
  }, [chartRef, filename, onDownload])

  return (
    <>
      <Tooltip title="Download chart">
        <IconButton
          size="small"
          onClick={handleClick}
          aria-controls={open ? "download-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          sx={{
            color: "#9ca3af",
            "&:hover": {
              bgcolor: "#f3f4f6",
              color: "#6366f1",
            },
          }}
        >
          <Download sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Menu
        id="download-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
              border: "1px solid rgba(0, 0, 0, 0.08)",
            },
          },
        }}
      >
        <MenuItem onClick={downloadAsPNG} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <ImageIcon fontSize="small" sx={{ color: "#6366f1" }} />
          </ListItemIcon>
          <ListItemText
            primary="Download as PNG"
            secondary="High resolution image"
            primaryTypographyProps={{ fontWeight: 500, fontSize: "0.875rem" }}
            secondaryTypographyProps={{ fontSize: "0.75rem" }}
          />
        </MenuItem>
        <MenuItem onClick={downloadAsSVG} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <SvgIcon fontSize="small" sx={{ color: "#8b5cf6" }} />
          </ListItemIcon>
          <ListItemText
            primary="Download as SVG"
            secondary="Vector format"
            primaryTypographyProps={{ fontWeight: 500, fontSize: "0.875rem" }}
            secondaryTypographyProps={{ fontSize: "0.75rem" }}
          />
        </MenuItem>
      </Menu>
    </>
  )
}
