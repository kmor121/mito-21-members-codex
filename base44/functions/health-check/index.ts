Deno.serve(() => {
  return Response.json({
    ok: true,
    service: "mito21-members-codex",
    timestamp: new Date().toISOString()
  });
});
