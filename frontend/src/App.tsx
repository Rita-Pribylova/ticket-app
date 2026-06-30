import React, { useState, useEffect } from "react";
import { Trash2, Shield, ShieldAlert, Search, PlusCircle } from "lucide-react";
import "./styles.css";

type TicketStatus = "new" | "in_progress" | "done";
type TicketPriority = "low" | "normal" | "high";

interface Ticket {
  id: number;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse {
  total: number;
  page: number;
  size: number;
  items: Ticket[];
}

const API_BASE = "http://localhost:8000/api";

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const size = 5;

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<TicketPriority>("normal");

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [authHeader, setAuthHeader] = useState<string | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      if (priorityFilter) params.append("priority", priorityFilter);

      const response = await fetch(`${API_BASE}/tickets?${params.toString()}`);
      if (!response.ok) throw new Error("Ошибка при загрузке данных с сервера");

      const data: PaginatedResponse = await response.json();
      setTickets(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setApiError(err.message || "Неизвестная ошибка API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [page, statusFilter, priorityFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  const handleCreateTicket = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    setApiError(null);
    try {
      const response = await fetch(`${API_BASE}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription || null,
          priority: newPriority,
        }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.detail || "Не удалось создать заявку");

      setNewTitle("");
      setNewDescription("");
      setNewPriority("normal");
      setPage(1);
      fetchTickets();
    } catch (err: any) {
      setApiError(err.message);
    }
  };
  const handleStatusChange = async (id: number, newStatus: TicketStatus) => {
    setApiError(null);
    try {
      const response = await fetch(`${API_BASE}/tickets/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.detail || "Ошибка обновления статуса");

      fetchTickets();
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const handleDeleteTicket = async (id: number) => {
    if (!authHeader) {
      setApiError("Только администратор может удалять заявки");
      return;
    }
    setApiError(null);
    try {
      const response = await fetch(`${API_BASE}/tickets/${id}`, {
        method: "DELETE",
        headers: { Authorization: authHeader },
      });

      if (!response.ok) {
        const result = await response
          .json()
          .catch(() => ({ detail: "Ошибка удаления" }));
        throw new Error(result.detail || "Не удалось удалить заявку");
      }

      fetchTickets();
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const handleAdminLogin = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    setApiError(null);
    const token = "Basic " + btoa(`${adminUsername}:${adminPassword}`);
    try {
      const response = await fetch(`${API_BASE}/admin/verify`, {
        headers: { Authorization: token },
      });
      if (!response.ok)
        throw new Error("Неверные учетные данные администратора");

      setAuthHeader(token);
      setIsAdmin(true);
      setAdminPassword("");
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setAuthHeader(null);
    setAdminUsername("");
  };

  const totalPages = Math.ceil(total / size);

  const getPriorityClass = (priority: TicketPriority) => {
    if (priority === "high") return "badge-priority priority-high";
    if (priority === "normal") return "badge-priority priority-normal";
    return "badge-priority priority-low";
  };
  return (
    <div className="app-container">
      <header className="app-header">
        <h2>Учёт внутренних заявок</h2>
        <div className="admin-panel">
          {isAdmin ? (
            <div className="admin-status-active">
              <Shield size={18} /> Режим: Администратор
              <button onClick={handleAdminLogout} className="btn-logout">
                Выйти
              </button>
            </div>
          ) : (
            <form onSubmit={handleAdminLogin} className="admin-login-form">
              <span>
                <ShieldAlert size={16} /> Админ-панель:
              </span>
              <input
                type="text"
                placeholder="Логин"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Пароль"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
              />
              <button type="submit">Войти</button>
            </form>
          )}
        </div>
      </header>

      {apiError && (
        <div className="error-banner">
          <strong>Ошибка:</strong> {apiError}
        </div>
      )}

      <div className="main-layout">
        <div>
          <div className="form-card">
            <h4
              style={{
                marginTop: 0,
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <PlusCircle size={18} /> Создать заявку
            </h4>
            <form onSubmit={handleCreateTicket}>
              <div className="form-group">
                <label>Название *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  minLength={3}
                  maxLength={120}
                  required
                  placeholder="От 3 до 120 символов"
                />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="До 1000 символов"
                />
              </div>
              <div className="form-group">
                <label>Приоритет</label>
                <select
                  value={newPriority}
                  onChange={(e) =>
                    setNewPriority(e.target.value as TicketPriority)
                  }
                >
                  <option value="low">Низкий (Low)</option>
                  <option value="normal">Обычный (Normal)</option>
                  <option value="high">Высокий (High)</option>
                </select>
              </div>
              <button type="submit" className="btn-submit">
                Отправить заявку
              </button>
            </form>
          </div>
        </div>

        <div>
          <div className="toolbar">
            <form onSubmit={handleSearchSubmit} className="search-form">
              <input
                type="text"
                placeholder="Поиск по тексту..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn-search">
                <Search size={14} />
              </button>
            </form>

            <div className="filter-group">
              <label>Статус</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Все</option>
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Приоритет</label>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Все</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Сортировка</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="created_at">Дате создания</option>
                <option value="priority">Приоритету</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Порядок</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="desc">Убывание</option>
                <option value="asc">Возрастание</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="info-text">Загрузка списка заявок...</div>
          ) : tickets.length === 0 ? (
            <div
              className="info-text"
              style={{ border: "2px dashed #cbd5e0", borderRadius: "8px" }}
            >
              Заявки не найдены.
            </div>
          ) : (
            <div>
              <table className="tickets-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Заявка</th>
                    <th>Приоритет</th>
                    <th>Статус</th>
                    <th>Удалить</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className={ticket.status === "done" ? "row-done" : ""}
                    >
                      <td style={{ fontWeight: "bold" }}>#{ticket.id}</td>
                      <td>
                        <div
                          className={
                            ticket.status === "done" ? "ticket-title-done" : ""
                          }
                          style={{ fontWeight: "bold" }}
                        >
                          {ticket.title}
                        </div>
                        {ticket.description && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#4a5568",
                              marginTop: "2px",
                            }}
                          >
                            {ticket.description}
                          </div>
                        )}
                        <div className="ticket-dates">
                          <span className="date-item">
                            <strong>Создано:</strong>{" "}
                            {new Date(ticket.created_at).toLocaleString()}
                          </span>
                          <span className="date-item">
                            <strong>Изменено:</strong>{" "}
                            {new Date(ticket.updated_at).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={getPriorityClass(ticket.priority)}>
                          {ticket.priority.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <select
                          value={ticket.status}
                          disabled={ticket.status === "done"}
                          onChange={(e) =>
                            handleStatusChange(
                              ticket.id,
                              e.target.value as TicketStatus,
                            )
                          }
                        >
                          <option value="new">New</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDeleteTicket(ticket.id)}
                          disabled={!isAdmin || ticket.status === "done"}
                          className="btn-delete"
                          style={{
                            background:
                              isAdmin && ticket.status !== "done"
                                ? "#e53e3e"
                                : "#cbd5e0",
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pagination-panel">
                <span style={{ fontSize: "13px" }}>
                  Всего элементов: <strong>{total}</strong>
                </span>
                <div className="pagination-buttons">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Назад
                  </button>
                  <span style={{ padding: "6px 12px", fontSize: "13px" }}>
                    {page} из {totalPages || 1}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Вперед
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
