export const APP_CONFIG = {
  appName: "Registro Compartido",
  workspaceId: "demo-workspace",

  // Cambia a "supabase" cuando ya tengas creado el proyecto y hayas pegado
  // tus valores publicos en la seccion supabase.
  backend: "local",

  supabase: {
    url: "https://TU-PROYECTO.supabase.co",
    anonKey: "TU-ANON-KEY-PUBLICA",
    cdnUrl: "https://esm.sh/@supabase/supabase-js@2"
  },

  googleDrive: {
    enabled: false,
    clientId: "TU-GOOGLE-CLIENT-ID.apps.googleusercontent.com"
  }
};
