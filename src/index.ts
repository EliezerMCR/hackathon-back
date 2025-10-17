import app from './app';

const PORT = process.env.PORT || 3000;

// Start server (solo para desarrollo/producción local)
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});