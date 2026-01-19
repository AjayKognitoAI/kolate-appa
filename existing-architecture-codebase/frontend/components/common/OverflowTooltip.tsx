"use client"

import { useState, useEffect, useRef } from "react"
import { Box, Tooltip } from "@mui/material"

interface OverflowTooltipProps {
  title: string
  children: React.ReactNode
}

// Helper component that shows tooltip only when text overflows
export function OverflowTooltip({ title, children }: OverflowTooltipProps) {
  const [isOverflowing, setIsOverflowing] = useState(false)
  const textRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current) {
        const child = textRef.current.firstElementChild as HTMLElement
        if (child) {
          setIsOverflowing(child.scrollWidth > child.clientWidth)
        }
      }
    }
    checkOverflow()
    window.addEventListener("resize", checkOverflow)
    return () => window.removeEventListener("resize", checkOverflow)
  }, [title])

  return (
    <Tooltip title={title} arrow disableHoverListener={!isOverflowing}>
      <Box ref={textRef} sx={{ minWidth: 0 }}>
        {children}
      </Box>
    </Tooltip>
  )
}
