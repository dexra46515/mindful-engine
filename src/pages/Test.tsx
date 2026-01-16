import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

export default function Test() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const sendEvent = async (eventType: string, eventData: Record<string, unknown> = {}) => {
    if (!user) return;
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("ingest-event", {
        body: {
          user_id: user.id,
          event_type: eventType,
          device_identifier: "test-device-web",
          platform: "web",
          screen_name: "test_screen",
          event_data: eventData,
        },
      });

      if (error) throw error;

      setResults((prev) => [
        { timestamp: new Date().toISOString(), event: eventType, response: data },
        ...prev.slice(0, 9),
      ]);

      toast({
        title: `Event sent: ${eventType}`,
        description: "Check results below",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast({
        variant: "destructive",
        title: "Event failed",
        description: message,
      });
    }

    setSending(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Behavioral Engine Test</h1>
            <p className="text-muted-foreground">
              Logged in as: {user?.email}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

        {/* Event Triggers */}
        <Card>
          <CardHeader>
            <CardTitle>Send Test Events</CardTitle>
            <CardDescription>
              Click buttons to trigger behavioral events and see the multi-agent response
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                onClick={() => sendEvent("app_open")}
                disabled={sending}
                variant="outline"
              >
                App Open
              </Button>
              <Button
                onClick={() => sendEvent("app_close")}
                disabled={sending}
                variant="outline"
              >
                App Close
              </Button>
              <Button
                onClick={() => sendEvent("session_start")}
                disabled={sending}
                variant="outline"
              >
                Session Start
              </Button>
              <Button
                onClick={() => sendEvent("session_end")}
                disabled={sending}
                variant="outline"
              >
                Session End
              </Button>
              <Button
                onClick={() => sendEvent("reopen")}
                disabled={sending}
                variant="secondary"
              >
                Reopen (Risk+)
              </Button>
              <Button
                onClick={() => sendEvent("scroll", { velocity: 2500 })}
                disabled={sending}
                variant="secondary"
              >
                Fast Scroll (Risk+)
              </Button>
              <Button
                onClick={() => sendEvent("screen_view", { screen: "feed" })}
                disabled={sending}
                variant="outline"
              >
                Screen View
              </Button>
              <Button
                onClick={() => sendEvent("tap", { element: "like_button" })}
                disabled={sending}
                variant="outline"
              >
                Tap
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                High-risk simulation (triggers intervention):
              </p>
              <Button
                onClick={async () => {
                  await sendEvent("reopen");
                  await sendEvent("reopen");
                  await sendEvent("scroll", { velocity: 3000 });
                  await sendEvent("scroll", { velocity: 3500 });
                }}
                disabled={sending}
                variant="destructive"
              >
                Simulate High-Risk Behavior
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Event Results</CardTitle>
            <CardDescription>
              Real-time responses from the behavioral engine
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No events sent yet. Click a button above to test.
              </p>
            ) : (
              <div className="space-y-3">
                {results.map((result, i) => (
                  <div
                    key={i}
                    className="p-4 bg-muted rounded-lg space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {String(result.event)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {String(result.timestamp)}
                      </span>
                    </div>
                    <pre className="text-xs overflow-auto max-h-40">
                      {JSON.stringify(result.response, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
