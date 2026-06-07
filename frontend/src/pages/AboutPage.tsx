export function AboutPage() {
  return (
    <div className="page">
      <div className="card">
        <h2>About Nerd Quiz</h2>

        <div className="about-section">
          <h3>🎮 How the Game Works</h3>
          <p>
            Nerd Quiz is a multiplayer quiz game where participants answer multiple-choice questions.
            A quiz round consists of several questions that all players answer simultaneously.
            After everyone finalizes their answers, the results are revealed showing who got the most correct.
          </p>
          <p>
            <strong>Rounds:</strong> Everyone can start a round by selecting questions and the number of participants and team.
            Each player works through the questions at their own pace, then finalizes their answers.
            Once all participants have finished, the round is complete and scores are tallied.
          </p>
        </div>

        <div className="about-section">
          <h3>👥 Teams</h3>
          <p>
            Teams group players together for themed quiz rounds. Questions can be excluded by category
            for each team, allowing for specialization (e.g., a team could be "Movies Only" or "Tech Experts").
          </p>
          <p>
            <strong>Creating Teams:</strong> Users can create teams and invite other users.
            Each team owner can invite users by name. Invited users see their invites on the teams page.
          </p>
        </div>

        <div className="about-section">
          <h3>✉️ Invitations</h3>
          <p>
            To invite users to a team, go to the Teams page and create a team if you haven't already.
            Then add the user by their username.
          </p>
          <p>
            Team members receive exclusive access to team-specific quiz rounds and can have
            category exclusions tailored to their team's theme or expertise.
          </p>
        </div>

        <div className="about-section">
          <h3>➕ Adding Questions</h3>
          <p>
            You can submit new questions directly through the website. Go to the Questions page and create you own.
          </p>
          <p>
            For bulk submissions, download the template file and fill it out with your questions:
          </p>

          <div className="download-section">
            <a
              href="/questions_template.csv"
              download
              className="btn btn-primary"
              style={{ marginTop: '0.5rem' }}
            >
              Download Question Template
            </a>
          </div>

          <div className="template-info" style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '4px' }}>
            <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>📋 Template Instructions</h4>
            <p style={{ marginBottom: '0.5rem' }}>
              The CSV template contains the following columns (semicolon-separated):
            </p>
            <ul style={{ marginBottom: '0.5rem', paddingLeft: '1.5rem' }}>
              <li><strong>questionId</strong> — Leave empty for a new question. If you provide an existing ID, the question will be overwritten.</li>
              <li><strong>questionText</strong> — The quiz question</li>
              <li><strong>answerA, answerB, answerC, answerD</strong> — The four answer options</li>
              <li><strong>correctAnswer</strong> — A, B, C, or D indicating the correct choice</li>
              <li><strong>category</strong> — Optional category name (will be created if new)</li>
              <li><strong>difficulty</strong> — Easy, Medium, or Hard</li>
              <li><strong>info</strong> — Extra explanation shown in round results (optional)</li>
            </ul>
            <p style={{ marginBottom: 0, color: 'var(--accent)' }}>
              ⚠️ Warning: Using an existing questionId will overwrite that question. Double-check IDs before importing!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}