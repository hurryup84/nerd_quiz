import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

interface Team {
  id: string;
  name: string;
  description?: string;
}

interface UserTeam {
  role: string;
  team: Team;
}

interface TeamInvite {
  id: number;
  team: { id: string; name: string };
  inviter: { id: number; username: string };
}

interface TeamMember {
  userId: number;
  role: string;
  user: { id: number; username: string };
}

interface PendingInvite {
  id: number;
  team: { id: string; name: string };
  inviter: { id: number; username: string };
  invitee: { id: number; username: string };
}

interface Category {
  id: number;
  name: string;
}

interface QuestionsMeta {
  categories: Category[];
}

interface ExcludedCategory {
  categoryId: number;
  category: Category;
}

export function TeamsPage() {
  const queryClient = useQueryClient();
  const [teamName, setTeamName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [inviteUsername, setInviteUsername] = useState('');
  const [message, setMessage] = useState('');

  const { data: myUserTeams = [], isLoading: teamsLoading } = useQuery<UserTeam[]>({
    queryKey: ['teams', 'me'],
    queryFn: () => api.teams.getMyTeams() as Promise<UserTeam[]>,
  });

  const { data: pendingInvites = [] } = useQuery<TeamInvite[]>({
    queryKey: ['teams', 'invites'],
    queryFn: () => api.teams.getMyInvites() as Promise<TeamInvite[]>,
  });

  const selectedMembership = myUserTeams.find((ut) => ut.team.id === selectedTeamId);

  const { data: teamDetails, isLoading: membersLoading } = useQuery<{
    members: TeamMember[];
  } | null>({
    queryKey: ['teams', 'members', selectedTeamId],
    queryFn: () =>
      selectedTeamId
        ? (api.teams.getMembers(selectedTeamId) as Promise<{ members: TeamMember[] }>)
        : Promise.resolve(null),
    enabled: !!selectedTeamId,
  });

  const { data: pendingTeamInvites = [] } = useQuery<PendingInvite[]>({
    queryKey: ['teams', 'pendingInvites', selectedTeamId],
    queryFn: () =>
      selectedTeamId && selectedMembership?.role === 'OWNER'
        ? (api.teams.getPendingInvites(selectedTeamId) as Promise<PendingInvite[]>)
        : Promise.resolve([]),
    enabled: !!selectedTeamId && selectedMembership?.role === 'OWNER',
  });

  // Category exclusion queries
  const { data: questionsMeta } = useQuery<QuestionsMeta>({
    queryKey: ['questions', 'meta'],
    queryFn: () => api.get<QuestionsMeta>('/questions/meta'),
    staleTime: 1000 * 60 * 10,
  });

  const { data: excludedCategories = [] } = useQuery<ExcludedCategory[]>({
    queryKey: ['teams', 'excludedCategories', selectedTeamId],
    queryFn: () =>
      selectedTeamId
        ? api.teams.getExcludedCategories(selectedTeamId)
        : Promise.resolve([]),
    enabled: !!selectedTeamId && selectedMembership?.role === 'OWNER',
  });

  const toggleExclusionMutation = useMutation({
    mutationFn: ({ teamId, categoryId, isExcluded }: { teamId: string; categoryId: number; isExcluded: boolean }) =>
      api.teams.toggleExclusion(teamId, categoryId, isExcluded),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teams', 'excludedCategories'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.teams.create({ name }),
    onSuccess: () => {
      setTeamName('');
      setMessage('Team created.');
      void queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const inviteMutation = useMutation({
    mutationFn: ({ teamId, username }: { teamId: string; username: string }) =>
      api.teams.invite(teamId, username),
    onSuccess: () => {
      setInviteUsername('');
      setMessage('Invite sent.');
      // Refetch pending invites for the selected team and global pending invites
      void queryClient.refetchQueries({ queryKey: ['teams', 'invites'] });
      if (selectedTeamId) {
        void queryClient.refetchQueries({
          queryKey: ['teams', 'pendingInvites', selectedTeamId],
        });
      }
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const acceptMutation = useMutation({
    mutationFn: (inviteId: number) => api.teams.acceptInvite(inviteId),
    onSuccess: () => {
      setMessage('Invite accepted.');
      void queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const declineMutation = useMutation({
    mutationFn: (inviteId: number) => api.teams.declineInvite(inviteId),
    onSuccess: () => {
      void queryClient.refetchQueries({ queryKey: ['teams', 'invites'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (inviteId: number) => api.teams.revokeInvite(inviteId),
    onSuccess: () => {
      setMessage('Invite revoked.');
      void queryClient.invalidateQueries({ queryKey: ['teams', 'pendingInvites'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (teamId: string) => api.teams.delete(teamId),
    onSuccess: () => {
      setSelectedTeamId(null);
      setMessage('Team deleted.');
      void queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const leaveMutation = useMutation({
    mutationFn: (teamId: string) => api.teams.leave(teamId),
    onSuccess: () => {
      setSelectedTeamId(null);
      setMessage('You left the team.');
      void queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    createMutation.mutate(teamName.trim());
  };

  const handleInvite = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !inviteUsername.trim()) return;
    inviteMutation.mutate({ teamId: selectedTeamId, username: inviteUsername.trim() });
  };

  const handleToggleExclusion = (categoryId: number, currentlyExcluded: boolean) => {
    if (!selectedTeamId) return;
    toggleExclusionMutation.mutate({
      teamId: selectedTeamId,
      categoryId,
      isExcluded: !currentlyExcluded,
    });
  };

  if (teamsLoading) return <div className="loading">Loading teams…</div>;

  return (
    <div className="page">
      <h1>Teams</h1>
      {message && <div className="alert alert-info">{message}</div>}

      {pendingInvites.length > 0 && (
        <div className="card">
          <h2>Pending Invites</h2>
          <ul className="members-list">
            {pendingInvites.map((inv) => (
              <li key={inv.id}>
                <strong>{inv.team.name}</strong> — invited by {inv.inviter.username}
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => acceptMutation.mutate(inv.id)}
                    disabled={acceptMutation.isPending}
                  >
                    Accept
                  </button>
                  <button
                    className="btn-sm"
                    onClick={() => declineMutation.mutate(inv.id)}
                    disabled={declineMutation.isPending}
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2>Create a Team</h2>
        <form onSubmit={handleCreate} className="form">
          <div className="form-group">
            <label>Team Name</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter team name"
              required
            />
          </div>
          <button className="btn btn-text" type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create Team'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>My Teams</h2>
        {myUserTeams.length > 0 ? (
          <div className="teams-list">
            {myUserTeams.map(({ team, role }) => (
              <div key={team.id} className="team-item">
                <div className="team-info">
                  <strong>{team.name}</strong>
                  <span className="team-role">{role}</span>
                </div>
                <div className="team-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setSelectedTeamId(team.id);
                      setInviteUsername('');
                    }}
                  >
                    Manage
                  </button>
                  {role === 'OWNER' ? (
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        if (window.confirm(`Delete team "${team.name}"?`)) {
                          deleteMutation.mutate(team.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      className="btn-sm"
                      onClick={() => {
                        if (window.confirm(`Leave team "${team.name}"?`)) {
                          leaveMutation.mutate(team.id);
                        }
                      }}
                      disabled={leaveMutation.isPending}
                    >
                      Leave
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>You are not a member of any teams yet.</p>
        )}
      </div>

      {selectedTeamId && selectedMembership && (
        <div className="card">
          <div className="card-header">
            <h2>{selectedMembership.team.name}</h2>
            <button className="btn btn-text" onClick={() => setSelectedTeamId(null)}>
              Close
            </button>
          </div>

          {membersLoading ? (
            <p>Loading members…</p>
          ) : (
            <>
              <h3>Members</h3>
              <ul className="members-list">
                {teamDetails?.members.map((m) => (
                  <li key={m.userId}>
                    {m.user.username} ({m.role})
                  </li>
                ))}
              </ul>

              {selectedMembership.role === 'OWNER' && (
                <>
                  {/* Category Exclusions */}
                  <div style={{ marginTop: '1rem' }}>
                    <h3>Excluded Categories</h3>
                    {questionsMeta?.categories && questionsMeta.categories.length > 0 ? (
                      <div className="categories-list">
                        {questionsMeta.categories.map((category) => {
                          const isExcluded = excludedCategories.some(
                            (ec) => ec.categoryId === category.id,
                          );
                          return (
                            <div key={category.id} className="category-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                              <span>{category.name}</span>
                              <button
                                className={isExcluded ? 'btn btn-danger btn-sm' : 'btn-primary btn-sm'}
                                onClick={() => handleToggleExclusion(category.id, isExcluded)}
                                disabled={toggleExclusionMutation.isPending}
                              >
                                {isExcluded ? 'Excluded' : 'Included'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="muted">No categories available.</p>
                    )}
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <h3>Pending Invites</h3>
                    {pendingTeamInvites.length > 0 ? (
                      <ul className="members-list">
                        {pendingTeamInvites.map((inv) => (
                          <li key={inv.id}>
                            <strong>{inv.invitee.username}</strong>
                            <span className="muted" style={{ marginLeft: '0.5rem' }}>
                              invited by {inv.inviter.username}
                            </span>
                            <div style={{ marginTop: '0.25rem' }}>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                  if (window.confirm(`Revoke invite to ${inv.invitee.username}?`)) {
                                    revokeInviteMutation.mutate(inv.id);
                                  }
                                }}
                                disabled={revokeInviteMutation.isPending}
                              >
                                {revokeInviteMutation.isPending ? 'Revoking…' : 'Revoke'}
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">No pending invites.</p>
                    )}
                  </div>

                  <form onSubmit={handleInvite} className="form" style={{ marginTop: '1rem' }}>
                    <h3>Invite by username</h3>
                    <div className="form-group">
                      <label>Username</label>
                      <input
                        type="text"
                        value={inviteUsername}
                        onChange={(e) => setInviteUsername(e.target.value)}
                        placeholder="Enter username"
                        required
                      />
                    </div>
                    <button className="btn btn-text" type="submit" disabled={inviteMutation.isPending}>
                      {inviteMutation.isPending ? 'Sending…' : 'Send Invite'}
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}