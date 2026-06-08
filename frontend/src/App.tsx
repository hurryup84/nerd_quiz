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
import { AdminQuestionsMetaPage } from './pages/AdminQuestionsMetaPage';
import { QuestionFormPage } from './pages/QuestionFormPage';
import { SubmitQuestionPage } from './pages/SubmitQuestionPage';
import { HistoryPage } from './pages/HistoryPage';
import { InsightsPage } from './pages/InsightsPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { TeamsPage } from './pages/TeamsPage';
import { AdminTeamsPage } from './pages/AdminTeamsPage';
import { AboutPage } from './pages/AboutPage';
import { ImporterPage } from './pages/ImporterPage';
import { ImporterListPage } from './pages/ImporterListPage';
import { AdminPage } from './pages/AdminPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminAppPage } from './pages/AdminAppPage';
import { QuestionsPage } from './pages/QuestionsPage';

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
            <Route path="/admin" element={<ProtectedRoute adminOnly><Layout><AdminPage /></Layout></ProtectedRoute>}>
              <Route path="teams" element={<AdminTeamsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="app" element={<AdminAppPage />} />
            </Route>
            <Route path="/questions" element={<ProtectedRoute><Layout><QuestionsPage /></Layout></ProtectedRoute>}>
              <Route index element={<Navigate to="/questions/create" replace />} />
              <Route path="create" element={<SubmitQuestionPage />} />
              <Route path="import" element={<ProtectedRoute importerOnly><ImporterPage /></ProtectedRoute>} />
              <Route path="list" element={<ProtectedRoute importerOnly><ImporterListPage /></ProtectedRoute>} />
              <Route path="manage" element={<ProtectedRoute adminOnly><AdminQuestionsPage /></ProtectedRoute>} />
              <Route path="edit/:id" element={<ProtectedRoute adminOnly><QuestionFormPage /></ProtectedRoute>} />
              <Route path="meta" element={<ProtectedRoute adminOnly><AdminQuestionsMetaPage /></ProtectedRoute>} />
            </Route>
            <Route path="/about" element={<ProtectedRoute><Layout><AboutPage /></Layout></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
