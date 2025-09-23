import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tv, Users, Zap, BarChart3 } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Tv className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">SignageAI</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Transform your digital signage with AI-powered content management and real-time playlist optimization.
          </p>
          <Button 
            size="lg" 
            className="bg-primary text-primary-foreground hover:opacity-90 px-8 py-3"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-login"
          >
            Get Started
          </Button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="card-shadow hover-lift">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Tv className="w-6 h-6 text-accent" />
              </div>
              <CardTitle className="text-lg">Multi-Screen Management</CardTitle>
              <CardDescription>
                Control multiple displays from a centralized dashboard with real-time status monitoring.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="card-shadow hover-lift">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">AI-Powered Suggestions</CardTitle>
              <CardDescription>
                Get intelligent content recommendations based on audience, time, and engagement data.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="card-shadow hover-lift">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <CardTitle className="text-lg">Team Collaboration</CardTitle>
              <CardDescription>
                Role-based access control with audit logging for team workflows and content approval.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="card-shadow hover-lift">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Real-Time Analytics</CardTitle>
              <CardDescription>
                Track performance metrics and optimize content delivery with detailed insights.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Demo Section */}
        <Card className="max-w-4xl mx-auto card-shadow">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl mb-4">Experience the Power of AI-Driven Digital Signage</CardTitle>
            <CardDescription className="text-lg">
              Streamline your content workflow with intelligent automation and real-time updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-accent rounded-full flex-shrink-0 mt-0.5"></div>
                  <div>
                    <h4 className="font-medium text-foreground">Auto-Tag Media</h4>
                    <p className="text-sm text-muted-foreground">AI automatically tags uploaded images and videos for easy organization.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex-shrink-0 mt-0.5"></div>
                  <div>
                    <h4 className="font-medium text-foreground">Smart Scheduling</h4>
                    <p className="text-sm text-muted-foreground">Optimize content timing based on audience patterns and engagement data.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-accent rounded-full flex-shrink-0 mt-0.5"></div>
                  <div>
                    <h4 className="font-medium text-foreground">Live Updates</h4>
                    <p className="text-sm text-muted-foreground">Push content changes instantly to connected displays via WebSocket.</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between text-sm opacity-75 mb-4">
                  <span>SignageAI Player</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Connected</span>
                  </div>
                </div>
                <div className="text-center py-8">
                  <h3 className="text-2xl font-bold mb-2">Welcome Display</h3>
                  <p className="opacity-75">Live content preview</p>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1 mt-4">
                  <div className="bg-primary h-1 rounded-full w-1/3"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center mt-16">
          <Button 
            size="lg" 
            className="bg-primary text-primary-foreground hover:opacity-90 px-8 py-3"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-login-bottom"
          >
            Start Free Trial
          </Button>
        </div>
      </div>
    </div>
  );
}
