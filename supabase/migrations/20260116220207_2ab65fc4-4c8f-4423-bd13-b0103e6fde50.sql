-- Enable realtime for interventions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.interventions;

-- Enable realtime for risk_states table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.risk_states;