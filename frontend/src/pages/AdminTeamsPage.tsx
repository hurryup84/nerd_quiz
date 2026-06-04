import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

interface TeamMember {
  userId: number;
  role: string;
  user: { id: number; username: string };
}

interface TeamWithMembers {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  creator: { id: number; username: string };
  members: TeamMember[];
  memberCount: number;
}

interface User {
  id: number;
  username: string;
  role: string;
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

type ViewMode = 'list' | 'detail';

export function AdminTeamsPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>('list');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addUserId, setAddUserId] = useState('');
  const [transferUserId, setTransferUserId] = useState('');

  const { data: teams = [], isLoading: teamsLoading } = useQuery<TeamWithMembers[]>({
    queryKey: ['teams', 'all'],
    queryFn: () => api.teams.getFilterOptions() as Promise<TeamWithMembers[]>,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users', 'all'],
    queryFn: () => api.users.listAll() as Promise<User[]>,
    enabled: view === 'detail' && !!selectedTeamId,
  });

  const { data: filteredUsers } = useQuery<User[]>({
    queryKey: ['users', 'search', searchQuery],
    queryFn: () => api.users.search(searchQuery) as Promise<User[]>,
    enabled: !!searchQuery,
  });

  const { data: pendingInvites = [] } = useQuery<PendingInvite[]>({
    queryKey: ['teams', 'pendingInvitesAdmin', selectedTeamId],
    queryFn: () =>
      selectedTeamId
        ? (api.teams.getPendingInvitesAdmin(selectedTeamId) as Promise<PendingInvite[]>)
        : Promise.resolve([]),
    enabled: !!selectedTeamId && view === 'detail',
  });

  // Category exclusion queries
  const { data: questionsMeta } = useQuery<QuestionsMeta>({
    queryKey: ['questions', 'meta'],
    queryFn: () => api.get<QuestionsMeta>('/questions/meta'),
    staleTime: 1000 * 60 * 10,
  });

  const { data: excludedCategories = [] } = useQuery<ExcludedCategory[]>({
    queryKey: ['teams', 'excludedCategoriesAdmin', selectedTeamId],
    queryFn: () =>
      selectedTeamId
        ? api.teams.getExcludedCategoriesAdmin(selectedTeamId)
        : Promise.resolve([]),
    enabled: !!selectedTeamId && view === 'detail',
  });

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: number }) =>
      api.teams.addMember(teamId, userId),
    onSuccess: () => {
      setAddUserId('');
      void queryClient.invalidateQueries({ queryKey: ['teams', 'all'] });
    },
    onError: (err: Error) => alert(err.message),
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: number }) =>
      api.teams.removeMember(teamId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teams', 'all'] });
    },
    onError: (err: Error) => alert(err.message),
  });

  // Transfer ownership mutation
  const transferMutation = useMutation({
    mutationFn: ({ teamId, newOwnerId }: { teamId: string; newOwnerId: number }) =>
      api.teams.transferOwnership(teamId, newOwnerId),
    onSuccess: () => {
      setTransferUserId('');
      void queryClient.invalidateQueries({ queryKey: ['teams', 'all'] });
    },
    onError: (err: Error) => alert(err.message),
  });

  // Delete team mutation
  const deleteMutation = useMutation({
    mutationFn: (teamId: string) => api.teams.delete(teamId),
    onSuccess: () => {
      setSelectedTeamId(null);
      setView('list');
      void queryClient.invalidateQueries({ queryKey: ['teams', 'all'] });
    },
    onError: (err: Error) => alert(err.message),
  });

  // Revoke invite mutation
  const revokeInviteMutation = useMutation({
    mutationFn: (inviteId: number) => api.teams.revokeInviteAdmin(inviteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teams', 'pendingInvitesAdmin'] });
    },
    onError: (err: Error) => alert(err.message),
  });

  // Toggle exclusion mutation (admin)
  const toggleExclusionMutation = useMutation({
    mutationFn: ({ teamId, categoryId, isExcluded }: { teamId: string; categoryId: number; isExcluded: boolean }) =>
      api.teams.toggleExclusionAdmin(teamId, categoryId, isExcluded),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teams', 'excludedCategoriesAdmin'] });
    },
    onError: (err: Error) => alert(err.message),
  });

  const displayUsers = filteredUsers ?? users;

  const handleOpenDetail = (teamId: string) => {
    setSelectedTeamId(teamId);
    setView('detail');
    setSearchQuery('');
  };

  const handleAddMember = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !addUserId) return;
    addMemberMutation.mutate({ teamId: selectedTeamId, userId: Number(addUserId) });
  };

  const handleTransferOwnership = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !transferUserId) return;
    transferMutation.mutate({ teamId: selectedTeamId, newOwnerId: Number(transferUserId) });
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

  if (view === 'detail' && selectedTeam) {
    return (
      <div className="page">
        <div style={{ marginBottom: '1rem' }}>
          <button className="btn btn-sm" onClick={() => { setView('list'); setSelectedTeamId(null); }}>
            ← Back to teams
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>{selectedTeam.name}</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-danger"
                onClick={() => {
                  if (window.confirm(`Delete team "${selectedTeam.name}"? This cannot be undone.`)) {
                    deleteMutation.mutate(selectedTeam.id);
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                Delete Team
              </button>
            </div>
          </div>

          <div style={{ padding: '1rem' }}>
            <p>
              {selectedTeam.description || 'No description.'}
              <span className="muted" style={{ marginLeft: '1rem' }}>
                Created by {selectedTeam.creator.username}
              </span>
            </p>
          </div>

          <h3>Members ({selectedTeam.memberCount})</h3>
          {selectedTeam.members.length > 0 ? (
            <ul className="members-list">
              {selectedTeam.members.map((m) => (
                <li key={m.userId}>
                  <strong>{m.user.username}</strong>
                  <span className="team-role">{m.role}</span>
                  {m.role !== 'OWNER' && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        if (window.confirm(`Remove ${m.user.username} from this team?`)) {
                          removeMemberMutation.mutate({
                            teamId: selectedTeam.id,
                            userId: m.userId,
                          });
                        }
                      }}
                      disabled={removeMemberMutation.isPending}
                      style={{ marginLeft: '0.5rem' }}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No members.</p>
          )}

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
                    <div key={category.id} className="category-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
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

          {/* Pending invites */}
          <div style={{ marginTop: '1rem' }}>
            <h3>Pending Invites</h3>
            {pendingInvites.length > 0 ? (
              <ul className="members-list">
                {pendingInvites.map((inv) => (
                  <li key={inv.id}>
                    <strong>{inv.invitee.username}</strong>
                    <span className="muted" style={{ marginLeft: '0.5rem' }}>
                      invited by {inv.inviter.username}
                    </span>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        if (window.confirm(`Revoke invite to ${inv.invitee.username}?`)) {
                          revokeInviteMutation.mutate(inv.id);
                        }
                      }}
                      disabled={revokeInviteMutation.isPending}
                      style={{ marginLeft: '0.5rem' }}
                    >
                      Revoke
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No pending invites.</p>
            )}
          </div>

          {/* Add member */}
          <form onSubmit={handleAddMember} className="form" style={{ marginTop: '1rem' }}>
            <h3>Add Member</h3>
            <div className="form-group">
              <label>Search user</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search users…"
              />
            </div>
            <select
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value)}
              required
              style={{ width: '100%', marginBottom: '0.5rem' }}
            >
              <option value="">Select a user…</option>
              {displayUsers
                .filter((u) => !selectedTeam.members.some((m) => m.userId === u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
            </select>
            <button type="submit" disabled={addMemberMutation.isPending || !addUserId}>
              {addMemberMutation.isPending ? 'Adding…' : 'Add Member'}
            </button>
          </form>

          {/* Transfer ownership */}
          <form onSubmit={handleTransferOwnership} className="form" style={{ marginTop: '1rem' }}>
            <h3>Transfer Ownership</h3>
            <div className="form-group">
              <label>New owner</label>
              <select
                value={transferUserId}
                onChange={(e) => setTransferUserId(e.target.value)}
                required
              >
                <option value="">Select a member…</option>
                {selectedTeam.members
                  .filter((m) => m.role !== 'OWNER')
                  .map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.username}
                    </option>
                  ))}
              </select>
            </div>
            <button type="submit" disabled={transferMutation.isPending || !transferUserId}>
              {transferMutation.isPending ? 'Transferring…' : 'Transfer Ownership'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Admin — Teams</h1>

      <div className="card">
        <h2>All Teams ({teams.length})</h2>
        {teams.length > 0 ? (
          <table className="results-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Members</th>
                <th>Creator</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id}>
                  <td>
                    <strong>{team.name}</strong>
                    {team.description && (
                      <span className="muted" style={{ marginLeft: '0.5rem' }}>
                        {team.description.substring(0, 40)}
                        {team.description.length > 40 ? '…' : ''}
                      </span>
                    )}
                  </td>
                  <td>{team.memberCount}</td>
                  <td>{team.creator.username}</td>
                  <td>{new Date(team.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleOpenDetail(team.id)}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No teams yet.</p>
        )}
      </div>
    </div>
  );
}