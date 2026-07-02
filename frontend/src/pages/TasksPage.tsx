import { useEffect, useState } from 'react';
import { fetchTasks, type Task } from '../lib/api';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     fetchTasks().then(data => {
       setTasks(data);
       setLoading(false);
     });
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
     <div>
       <h2 className="mb-4">Tasks</h2>
       {tasks.length === 0 ? (
         <p>No tasks yet.</p>
       ) : (
         tasks.map(task => (
           <div key={task.id} style={{
             padding: '1rem',
             marginBottom: '0.75rem',
             background: '#fff',
             borderRadius: '8px',
             border: '1px solid #e0e0e0'
           }}>
             <strong>{task.title}</strong>
             <span style={{ marginLeft: '0.5rem', opacity: 0.6 }}>({task.status})</span>
             {task.customerRequest && (
               <br />
             )}{task.customerRequest && <p style={{ marginTop: '0.5rem' }}>{task.customerRequest}</p>}
           </div>
         ))
       )}
     </div>
   );
}
