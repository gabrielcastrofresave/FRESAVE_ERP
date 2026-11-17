// DailyView.tsx
import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { ProductionTask } from "./ProductionCalendar";

interface DailyViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  tasks: ProductionTask[];
  onEditTask: (task: ProductionTask) => void;
  onDeleteTask: (taskId: string) => void;
  getPriorityColor: (p: string) => string;
  getStatusColor: (s: string) => string;
}

export function DailyView({
  currentDate,
  setCurrentDate,
  tasks,
  onEditTask,
  onDeleteTask,
  getPriorityColor,
  getStatusColor,
}: DailyViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dateStr = currentDate.toLocaleDateString("pt-PT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const sortedTasks = [...tasks].sort((a, b) =>
    a.hora_inicio.localeCompare(b.hora_inicio),
  );

  return (
    <div className="space-y-4">
      {/* Navegação */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold capitalize">
          {dateStr}
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setDate(newDate.getDate() - 1);
              setCurrentDate(newDate);
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCurrentDate(new Date());
            }}
          >
            Hoje
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setDate(newDate.getDate() + 1);
              setCurrentDate(newDate);
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Timeline por hora */}
      <div className="space-y-2">
        {hours.map((hour) => {
          const hourStr = String(hour).padStart(2, "0");
          const tasksInHour = sortedTasks.filter((task) => {
            const startHour = parseInt(
              task.hora_inicio.split(":")[0],
            );
            return startHour === hour;
          });

          return (
            <div
              key={hour}
              className="flex border-b dark:border-gray-700 pb-4"
            >
              <div className="w-16 text-sm font-semibold text-gray-600 dark:text-gray-400 pt-2">
                {hourStr}:00
              </div>
              <div className="flex-1 space-y-2">
                {tasksInHour.length > 0 ? (
                  tasksInHour.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      getPriorityColor={getPriorityColor}
                      getStatusColor={getStatusColor}
                    />
                  ))
                ) : (
                  <div className="text-xs text-gray-400">
                    Sem tarefas
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// WeeklyView.tsx
interface WeeklyViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  weekTasks: { [key: string]: ProductionTask[] };
  onEditTask: (task: ProductionTask) => void;
  onDeleteTask: (taskId: string) => void;
  getPriorityColor: (p: string) => string;
  getStatusColor: (s: string) => string;
  getDayName: (date: Date) => string;
}

export function WeeklyView({
  currentDate,
  setCurrentDate,
  weekTasks,
  onEditTask,
  onDeleteTask,
  getPriorityColor,
  getStatusColor,
  getDayName,
}: WeeklyViewProps) {
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const weekStart = getWeekStart(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  return (
    <div className="space-y-4">
      {/* Navegação */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          Semana de{" "}
          {weekStart.toLocaleDateString("pt-PT")}
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setDate(newDate.getDate() - 7);
              setCurrentDate(newDate);
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCurrentDate(new Date());
            }}
          >
            Atual
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setDate(newDate.getDate() + 7);
              setCurrentDate(newDate);
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Grid semanal */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-2 min-w-max">
          {weekDays.map((day) => {
            const dateStr = day
              .toISOString()
              .split("T")[0];
            const dayTasks = weekTasks[dateStr] || [];

            return (
              <Card
                key={dateStr}
                className="min-w-[200px] p-3"
              >
                <h3 className="font-semibold text-sm mb-3">
                  {getDayName(day)}
                  <br />
                  <span className="text-xs text-gray-500">
                    {day.getDate()}
                  </span>
                </h3>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {dayTasks.length > 0 ? (
                    dayTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={onEditTask}
                        onDelete={onDeleteTask}
                        getPriorityColor={getPriorityColor}
                        getStatusColor={getStatusColor}
                        compact
                      />
                    ))
                  ) : (
                    <div className="text-xs text-gray-400">
                      Sem tarefas
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// MonthlyView.tsx
interface MonthlyViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  tasks: ProductionTask[];
  getTasksForDate: (date: Date) => ProductionTask[];
  onEditTask: (task: ProductionTask) => void;
  onDeleteTask: (taskId: string) => void;
  getMonthDays: (date: Date) => number;
}

export function MonthlyView({
  currentDate,
  setCurrentDate,
  tasks,
  getTasksForDate,
  onEditTask,
  onDeleteTask,
  getMonthDays,
}: MonthlyViewProps) {
  const monthStr = currentDate.toLocaleDateString("pt-PT", {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  );
  const lastDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  );

  const startDate = new Date(firstDay);
  startDate.setDate(
    startDate.getDate() - (firstDay.getDay() || 7) + 1,
  );

  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return date;
  });

  const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  return (
    <div className="space-y-4">
      {/* Navegação */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold capitalize">
          {monthStr}
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setMonth(newDate.getMonth() - 1);
              setCurrentDate(newDate);
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCurrentDate(new Date());
            }}
          >
            Mês Atual
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setMonth(newDate.getMonth() + 1);
              setCurrentDate(newDate);
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Cabeçalho de dias */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((name) => (
          <div
            key={name}
            className="text-center font-semibold text-sm py-2"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Grid do calendário */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date) => {
          const dateStr = date.toISOString().split("T")[0];
          const dayTasks = getTasksForDate(date);
          const isCurrentMonth =
            date.getMonth() === currentDate.getMonth();

          return (
            <Card
              key={dateStr}
              className={`p-2 min-h-[100px] ${
                isCurrentMonth
                  ? "bg-white dark:bg-gray-800"
                  : "bg-gray-50 dark:bg-gray-900/50 opacity-50"
              }`}
            >
              <p className="text-xs font-semibold mb-1">
                {date.getDate()}
              </p>
              <div className="space-y-1 text-[10px]">
                {dayTasks
                  .slice(0, 2)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 px-1 py-0.5 rounded truncate"
                    >
                      {task.titulo}
                    </div>
                  ))}
                {dayTasks.length > 2 && (
                  <div className="text-gray-500 px-1">
                    +{dayTasks.length - 2} mais
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// TaskCard.tsx
interface TaskCardProps {
  task: ProductionTask;
  onEdit: (task: ProductionTask) => void;
  onDelete: (taskId: string) => void;
  getPriorityColor: (p: string) => string;
  getStatusColor: (s: string) => string;
  compact?: boolean;
}

export function TaskCard({
  task,
  onEdit,
  onDelete,
  getPriorityColor,
  getStatusColor,
  compact = false,
}: TaskCardProps) {
  return (
    <div
      className={`${getPriorityColor(task.prioridade)} p-3 rounded-lg ${
        compact ? "text-xs" : ""
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h4 className="font-semibold">{task.titulo}</h4>
          {!compact && task.descricao && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {task.descricao.substring(0, 50)}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(task)}
            className="h-6 w-6 p-0"
          >
            <Edit2 className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(task.id)}
            className="h-6 w-6 p-0 text-red-600"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-xs font-mono">
          {task.hora_inicio} - {task.hora_fim}
        </span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded ${getStatusColor(
            task.status,
          )}`}
        >
          {task.status === "concluido"
            ? "Concluído"
            : task.status === "em_progresso"
              ? "Em Progresso"
              : "Pendente"}
        </span>
      </div>

      {task.images && task.images.length > 0 && (
        <div className="mt-2 flex gap-1 flex-wrap">
          {task.images.map((img) => (
            <img
              key={img.id}
              src={img.imagem_url}
              alt={img.descricao || "Tarefa"}
              className="w-8 h-8 rounded object-cover"
            />
          ))}
        </div>
      )}
    </div>
  );
}