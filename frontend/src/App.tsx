import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center p-4">
          <Routes>
            <Route path="/" element={
              <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  Ready to build features!
                </h1>
              </div>
            } />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
