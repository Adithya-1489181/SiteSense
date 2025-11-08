import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Activity, TrendingUp, Globe, Shield } from "lucide-react"

export function DashboardPreview() {
  const metrics = [
    {
      title: "Site Uptime",
      value: "99.98%",
      description: "Last 30 days",
      trend: "+0.1%",
      icon: Activity,
      color: "text-green-600"
    },
    {
      title: "Performance Score",
      value: "94/100",
      description: "Core Web Vitals",
      trend: "+5",
      icon: TrendingUp,
      color: "text-blue-600"
    },
    {
      title: "Security Rating",
      value: "A+",
      description: "SSL & Vulnerabilities",
      trend: "Stable",
      icon: Shield,
      color: "text-purple-600"
    },
    {
      title: "Global Reach",
      value: "12 Regions",
      description: "Monitoring locations",
      trend: "+2",
      icon: Globe,
      color: "text-orange-600"
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard Preview</h2>
        <Badge variant="secondary">Demo Mode</Badge>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => {
          const IconComponent = metric.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <IconComponent className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground">
                  {metric.description}
                </p>
                <div className="flex items-center pt-1">
                  <span className="text-xs text-green-600 font-medium">
                    {metric.trend}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Website Health Overview</CardTitle>
          <CardDescription>
            Real-time monitoring across all key metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Performance</span>
              <span>94%</span>
            </div>
            <Progress value={94} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Security</span>
              <span>98%</span>
            </div>
            <Progress value={98} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Accessibility</span>
              <span>87%</span>
            </div>
            <Progress value={87} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>SEO</span>
              <span>91%</span>
            </div>
            <Progress value={91} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center space-x-4">
        <Button>View Full Dashboard</Button>
        <Button variant="outline">Schedule Demo</Button>
      </div>
    </div>
  )
}