import { Role } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaTasks, FaCheckCircle, FaClock, FaExclamationTriangle } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";

// Mock data - in production, this would come from a database
const tasks = [
  {
    id: 1,
    title: "Complete project documentation",
    status: "completed",
    priority: "high",
    dueDate: "2024-01-15",
  },
  {
    id: 2,
    title: "Review code changes",
    status: "in-progress",
    priority: "medium",
    dueDate: "2024-01-20",
  },
  {
    id: 3,
    title: "Attend team meeting",
    status: "pending",
    priority: "high",
    dueDate: "2024-01-18",
  },
  {
    id: 4,
    title: "Update test cases",
    status: "pending",
    priority: "low",
    dueDate: "2024-01-25",
  },
];

export default async function EmployeeTasksPage() {
  return (
    <DashboardLayout requiredRole={Role.EMPLOYEE}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold uppercase">MY TASKS</h1>
          <p className="text-xs text-muted-foreground">
            Manage and track your assigned tasks
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase">
              <FaTasks className="h-4 w-4 text-blue-500" />
              ALL TASKS ({tasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      {task.status === "completed" ? (
                        <FaCheckCircle className="h-5 w-5 text-green-500" />
                      ) : task.status === "in-progress" ? (
                        <FaClock className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <FaExclamationTriangle className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">{task.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        Due: {task.dueDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        task.priority === "high"
                          ? "destructive"
                          : task.priority === "medium"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {task.priority.toUpperCase()}
                    </Badge>
                    <Badge
                      variant={
                        task.status === "completed"
                          ? "default"
                          : task.status === "in-progress"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {task.status.toUpperCase().replace("-", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

