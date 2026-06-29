from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Enum as SQLEnum, or_, desc, asc
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

DATABASE_URL = "sqlite:///./tickets.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

app = FastAPI(title="Ticket API")
security = HTTPBasic()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class TicketStatus(str, Enum):
    new = "new"
    in_progress = "in_progress"
    done = "done"

class TicketPriority(str, Enum):
    low = "low"
    normal = "normal"
    high = "high"

class TicketModel(Base):
    __tablename__ = "tickets"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(SQLEnum(TicketStatus), default=TicketStatus.new, nullable=False)
    priority = Column(SQLEnum(TicketPriority), default=TicketPriority.normal, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

Base.metadata.create_all(bind=engine)

class TicketCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=120)
    description: Optional[str] = Field(None, max_length=1000)
    priority: TicketPriority = TicketPriority.normal

class TicketUpdateStatus(BaseModel):
    status: TicketStatus

class TicketResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: TicketStatus
    priority: TicketPriority
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class PaginatedTicketResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[TicketResponse]

def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    if credentials.username != "admin" or credentials.password != "admin":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль администратора",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

@app.post("/api/tickets", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(ticket_data: TicketCreate, db: Session = Depends(get_db)):
    db_ticket = TicketModel(
        title=ticket_data.title,
        description=ticket_data.description,
        priority=ticket_data.priority,
        status=TicketStatus.new
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

@app.get("/api/tickets", response_model=PaginatedTicketResponse)
def get_tickets(
    db: Session = Depends(get_db),
    status_filter: Optional[TicketStatus] = Query(None, alias="status"),
    priority_filter: Optional[TicketPriority] = Query(None, alias="priority"),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at", pattern="^(created_at|priority)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100)
):
    query = db.query(TicketModel)
    if status_filter:
        query = query.filter(TicketModel.status == status_filter)
    if priority_filter:
        query = query.filter(TicketModel.priority == priority_filter)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(or_(TicketModel.title.ilike(search_filter), TicketModel.description.ilike(search_filter)))
    
    if sort_by == "priority":
        priority_order = desc(TicketModel.priority) if sort_order == "desc" else asc(TicketModel.priority)
        query = query.order_by(priority_order)
    else:
        date_order = desc(TicketModel.created_at) if sort_order == "desc" else asc(TicketModel.created_at)
        query = query.order_by(date_order)

    total = query.count()
    offset = (page - 1) * size
    items = query.offset(offset).limit(size).all()
    return {"total": total, "page": page, "size": size, "items": items}

@app.patch("/api/tickets/{ticket_id}/status", response_model=TicketResponse)
def update_ticket_status(ticket_id: int, status_update: TicketUpdateStatus, db: Session = Depends(get_db)):
    ticket = db.query(TicketModel).filter(TicketModel.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if ticket.status == TicketStatus.done:
        raise HTTPException(status_code=400, detail="Заявку в статусе 'done' нельзя редактировать")
    
    ticket.status = status_update.status
    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ticket)
    return ticket

@app.delete("/api/tickets/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(ticket_id: int, db: Session = Depends(get_db), admin_user: str = Depends(verify_admin)):
    ticket = db.query(TicketModel).filter(TicketModel.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if ticket.status == TicketStatus.done:
        raise HTTPException(status_code=400, detail="Заявку в статусе 'done' нельзя удалять")
    db.delete(ticket)
    db.commit()
    return None

@app.get("/api/admin/verify")
def verify_admin_token(admin_user: str = Depends(verify_admin)):
    return {"status": "authorized"}
