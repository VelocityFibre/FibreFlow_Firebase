"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Palette,
  Monitor,
  Sun,
  Moon,
  Zap,
  Wifi,
  Globe,
  Sparkles,
  Eye,
  Settings,
  Download,
  Upload,
  Package,
} from "lucide-react"

export function ThemeSettings() {
  const [darkMode, setDarkMode] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState("velocity")
  const [accentColor, setAccentColor] = useState("blue")

  const themes = [
    {
      id: "velocity",
      name: "Velocity Fibre",
      description: "Official Velocity Fibre brand colors with blue and red gradient",
      primary: "hsl(220, 70%, 40%)",
      secondary: "hsl(0, 70%, 50%)",
      accent: "hsl(220, 70%, 20%)",
      preview: "velocity-gradient",
      isDefault: true,
    },
    {
      id: "navy",
      name: "Navy Blue",
      description: "Professional dark blue theme for corporate environments",
      primary: "hsl(220, 70%, 20%)",
      secondary: "hsl(220, 70%, 40%)",
      accent: "hsl(220, 10%, 60%)",
      preview: "bg-gradient-to-r from-blue-800 to-blue-900",
    },
    {
      id: "fiber-blue",
      name: "Fiber Blue",
      description: "Blue theme inspired by fiber optic cables",
      primary: "hsl(220, 70%, 40%)",
      secondary: "hsl(220, 70%, 60%)",
      accent: "hsl(220, 70%, 20%)",
      preview: "bg-gradient-to-r from-blue-600 to-blue-800",
    },
    {
      id: "velocity-contrast",
      name: "High Contrast",
      description: "High contrast version with enhanced readability",
      primary: "hsl(220, 70%, 20%)",
      secondary: "hsl(0, 70%, 50%)",
      accent: "hsl(0, 0%, 0%)",
      preview: "bg-gradient-to-r from-blue-900 to-red-700",
    },
  ]

  const accentColors = [
    { id: "blue", name: "Blue", color: "hsl(220, 70%, 40%)", class: "bg-blue-600" },
    { id: "navy", name: "Navy", color: "hsl(220, 70%, 20%)", class: "bg-blue-900" },
    { id: "red", name: "Red", color: "hsl(0, 70%, 50%)", class: "bg-red-600" },
    { id: "gray", name: "Gray", color: "hsl(220, 10%, 60%)", class: "bg-gray-500" },
    { id: "blue-light", name: "Light Blue", color: "hsl(220, 70%, 60%)", class: "bg-blue-400" },
    { id: "red-light", name: "Light Red", color: "hsl(0, 70%, 60%)", class: "bg-red-400" },
  ]

  const brandElements = [
    {
      title: "Velocity Fibre Logo",
      description: "Official company branding with gradient V symbol",
      icon: Zap,
      color: "text-blue-600",
    },
    {
      title: "Network Connectivity",
      description: "Visual elements representing high-speed internet",
      icon: Wifi,
      color: "text-blue-800",
    },
    {
      title: "Global Reach",
      description: "International connectivity and infrastructure",
      icon: Globe,
      color: "text-blue-700",
    },
    {
      title: "Innovation",
      description: "Cutting-edge technology and modern design",
      icon: Sparkles,
      color: "text-red-600",
    },
  ]

  const exportTheme = () => {
    const themeConfig = {
      selectedTheme,
      accentColor,
      darkMode,
      customizations: {
        // Add any custom theme settings here
      },
    }

    const blob = new Blob([JSON.stringify(themeConfig, null, 2)], { type: "application/json" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "velocity-theme-config.json"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-500">Theme Settings</h2>
          <p className="text-muted-foreground">Customize the appearance and branding of your application</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportTheme}>
            <Download className="mr-2 h-4 w-4" />
            Export Theme
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import Theme
          </Button>
        </div>
      </div>

      <Tabs defaultValue="themes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="themes">Color Themes</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="themes" className="space-y-6">
          {/* Theme Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Color Themes
              </CardTitle>
              <CardDescription>Choose from pre-designed themes or create your own</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {themes.map((theme) => (
                  <Card
                    key={theme.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTheme === theme.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedTheme(theme.id)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{theme.name}</h3>
                            {theme.isDefault && (
                              <Badge variant="secondary" className="mt-1">
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className={`w-12 h-12 rounded-lg ${theme.preview}`}></div>
                        </div>
                        <p className="text-sm text-muted-foreground">{theme.description}</p>
                        <div className="flex gap-2">
                          <div
                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: theme.primary }}
                          ></div>
                          <div
                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: theme.secondary }}
                          ></div>
                          <div
                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: theme.accent }}
                          ></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Accent Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Accent Colors</CardTitle>
              <CardDescription>Choose an accent color for highlights and interactive elements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-3">
                {accentColors.map((color) => (
                  <button
                    key={color.id}
                    className={`relative w-16 h-16 rounded-lg ${color.class} transition-all hover:scale-105 ${
                      accentColor === color.id ? "ring-2 ring-offset-2 ring-gray-400" : ""
                    }`}
                    onClick={() => setAccentColor(color.id)}
                  >
                    {accentColor === color.id && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
                        </div>
                      </div>
                    )}
                    <span className="sr-only">{color.name}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          {/* Brand Elements */}
          <Card>
            <CardHeader>
              <CardTitle>Velocity Fibre Brand Elements</CardTitle>
              <CardDescription>Visual elements inspired by Velocity Fibre's brand identity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {brandElements.map((element) => (
                  <div key={element.title} className="flex items-start gap-4 p-4 border rounded-lg">
                    <element.icon className={`h-8 w-8 ${element.color}`} />
                    <div>
                      <h3 className="font-semibold">{element.title}</h3>
                      <p className="text-sm text-muted-foreground">{element.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Logo Showcase */}
          <Card>
            <CardHeader>
              <CardTitle>Brand Showcase</CardTitle>
              <CardDescription>How the Velocity Fibre brand appears in the application</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Logo Examples */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-[#0f172a] p-6 rounded-lg flex items-center justify-center">
                    <div className="relative w-full h-24">
                      <Image
                        src="/images/velocity-logo-white.png"
                        alt="Velocity Fibre White Logo"
                        fill
                        style={{ objectFit: "contain" }}
                      />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg border flex items-center justify-center">
                    <div className="relative w-full h-24">
                      <Image
                        src="/images/velocity-logo-icon.png"
                        alt="Velocity Fibre Icon"
                        fill
                        style={{ objectFit: "contain" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Header Example */}
                <div className="bg-gradient-to-r from-blue-800 to-blue-900 p-6 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="relative w-10 h-10">
                        <Image
                          src="/images/velocity-logo-icon.png"
                          alt="Velocity Fibre"
                          fill
                          style={{ objectFit: "contain" }}
                        />
                      </div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-pulse-velocity"></div>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Velocity Fibre</h2>
                      <p className="text-white/80">High-Speed Internet Solutions</p>
                    </div>
                  </div>
                </div>

                {/* Card Examples */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="velocity-gradient text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Wifi className="h-5 w-5" />
                        <span className="font-semibold">Network Status</span>
                      </div>
                      <p className="text-white/90">All systems operational</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-5 w-5" />
                        <span className="font-semibold">Global Reach</span>
                      </div>
                      <p className="text-white/90">Worldwide connectivity</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-blue-700 to-red-600 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-5 w-5" />
                        <span className="font-semibold">Innovation</span>
                      </div>
                      <p className="text-white/90">Cutting-edge technology</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="display" className="space-y-6">
          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Display Settings
              </CardTitle>
              <CardDescription>Configure how the application appears</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Dark Mode</Label>
                  <div className="text-sm text-muted-foreground">Switch between light and dark themes</div>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                  <Moon className="h-4 w-4" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">High Contrast</Label>
                  <div className="text-sm text-muted-foreground">Increase contrast for better accessibility</div>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Animations</Label>
                  <div className="text-sm text-muted-foreground">Enable smooth transitions and animations</div>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Fiber Glow Effects</Label>
                  <div className="text-sm text-muted-foreground">
                    Add glowing effects to simulate fiber optic cables
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          {/* Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
              <CardDescription>See how your theme choices look in the application</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Mini Dashboard Preview */}
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold">Dashboard Preview</h3>
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card className="bg-blue-900 text-white">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          <span className="font-semibold">Stock Items</span>
                        </div>
                        <div className="text-2xl font-bold mt-2">1,234</div>
                      </CardContent>
                    </Card>

                    <Card className="status-info">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Wifi className="h-5 w-5" />
                          <span className="font-semibold">Active Projects</span>
                        </div>
                        <div className="text-2xl font-bold mt-2">8</div>
                      </CardContent>
                    </Card>

                    <Card className="status-active">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Globe className="h-5 w-5" />
                          <span className="font-semibold">Suppliers</span>
                        </div>
                        <div className="text-2xl font-bold mt-2">15</div>
                      </CardContent>
                    </Card>

                    <Card className="status-warning">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          <span className="font-semibold">Low Stock</span>
                        </div>
                        <div className="text-2xl font-bold mt-2">3</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Status Badges Preview */}
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold">Status Indicators</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="status-active">In Stock</Badge>
                    <Badge className="status-warning">Low Stock</Badge>
                    <Badge className="status-error">Out of Stock</Badge>
                    <Badge className="status-info">Ordered</Badge>
                    <Badge className="status-navy">Allocated</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
