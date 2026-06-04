import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { QuizActivePage } from './pages/QuizActivePage';
import { StartQuizPage } from './pages/StartQuizPage';
import { AdminQuestionsPage } from './pages/AdminQuestionsPage';
import { QuestionFormPage } from './pages/QuestionFormPage';
import { SubmitQuestionPage } from './pages/SubmitQuestionPage';
import { HistoryPage } from './pages/HistoryPage';
import { InsightsPage } from './pages/InsightsPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { TeamsPage } from './pages/TeamsPage';
import { AdminTeamsPage } from './pages/AdminTeamsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
            <Route path="/quiz/start" element={<ProtectedRoute><Layout><StartQuizPage /></Layout></ProtectedRoute>} />
            <Route path="/quiz/:id" element={<ProtectedRoute><Layout><QuizActivePage /></Layout></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><Layout><HistoryPage /></Layout></ProtectedRoute>} />
            <Route path="/insights" element={<ProtectedRoute><Layout><InsightsPage /></Layout></ProtectedRoute>} />
            <Route path="/teams" element={<ProtectedRoute><Layout><TeamsPage /></Layout></ProtectedRoute>} />
            <Route path="/settings/password" element={<ProtectedRoute><Layout><ChangePasswordPage /></Layout></ProtectedRoute>} />
            <Route path="/questions/new" element={<ProtectedRoute><Layout><SubmitQuestionPage /></Layout></ProtectedRoute>} />
            <Route path="/admin/questions" element={<ProtectedRoute adminOnly><Layout><AdminQuestionsPage /></Layout></ProtectedRoute>} />
            <Route path="/admin/questions/add" element={<ProtectedRoute adminOnly><Layout><QuestionFormPage /></Layout></ProtectedRoute>} />
            <Route path="/admin/questions/:id/edit" element={<ProtectedRoute adminOnly><Layout><QuestionFormPage /></Layout></ProtectedRoute>} />
            <Route path="/admin/teams" element={<ProtectedRoute adminOnly><Layout><AdminTeamsPage /></Layout></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
