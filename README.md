hi# deepseek_project

I'll guide you through building a complete **Student Data Management System** with proper DevOps implementation. Let's create a practical 3-tier application where students can register and store their information.

## 📚 **Project: Student Data Management System**

### **Architecture Overview**
- **Frontend**: React.js (Student registration & data display)
- **Backend**: Node.js/Express (REST API)
- **Database**: PostgreSQL (Student records)
- **DevOps**: Docker, Kubernetes, CI/CD, Monitoring

## **Step 1: Project Structure**

```
student-management-system/
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── backend/
│   ├── src/
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── database/
│   ├── init.sql
│   └── Dockerfile
├── k8s/
│   ├── namespace.yaml
│   ├── frontend-deploy.yaml
│   ├── backend-deploy.yaml
│   ├── postgres-deploy.yaml
│   ├── secrets.yaml
│   └── ingress.yaml
├── ci-cd/
│   ├── jenkinsfile
│   └── gitlab-ci.yml
├── monitoring/
│   ├── prometheus.yml
│   └── grafana-dashboards/
└── docker-compose.yml
```

## **Step 2: Backend API (Node.js/Express)**

### **backend/package.json**
```json
{
  "name": "student-api",
  "version": "1.0.0",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "bcrypt": "^5.1.0",
    "joi": "^17.9.2",
    "winston": "^3.9.0"
  }
}
```

### **backend/src/server.js**
```javascript
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const logger = require('./logger');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Validation schema
const studentSchema = Joi.object({
  student_id: Joi.string().required(),
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  department: Joi.string().required(),
  enrollment_year: Joi.number().integer().min(2000).max(2024).required()
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Create student
app.post('/api/students', async (req, res) => {
  try {
    // Validate input
    const { error, value } = studentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(value.password, 10);

    // Insert into database
    const query = `
      INSERT INTO students (student_id, name, email, password, department, enrollment_year)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, student_id, name, email, department, enrollment_year, created_at
    `;
    
    const result = await pool.query(query, [
      value.student_id,
      value.name,
      value.email,
      hashedPassword,
      value.department,
      value.enrollment_year
    ]);

    logger.info(`Student created: ${value.student_id}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all students
app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, student_id, name, email, department, enrollment_year, created_at FROM students ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student by ID
app.get('/api/students/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;
    const result = await pool.query(
      'SELECT id, student_id, name, email, department, enrollment_year, created_at FROM students WHERE student_id = $1',
      [student_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update student
app.put('/api/students/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;
    const { name, email, department, enrollment_year } = req.body;

    const result = await pool.query(
      `UPDATE students 
       SET name = $1, email = $2, department = $3, enrollment_year = $4, updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $5
       RETURNING id, student_id, name, email, department, enrollment_year, created_at`,
      [name, email, department, enrollment_year, student_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete student
app.delete('/api/students/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;
    const result = await pool.query('DELETE FROM students WHERE student_id = $1 RETURNING id', [student_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
```

### **backend/src/logger.js**
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

module.exports = logger;
```

## **Step 3: Database Setup**

### **database/init.sql**
```sql
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    department VARCHAR(50) NOT NULL,
    enrollment_year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_student_id ON students(student_id);
CREATE INDEX idx_email ON students(email);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## **Step 4: Frontend (React)**

### **frontend/package.json**
```json
{
  "name": "student-frontend",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.4.0",
    "react-router-dom": "^6.11.2",
    "bootstrap": "^5.2.3"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  }
}
```

### **frontend/src/App.js**
```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

function App() {
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState({
    student_id: '',
    name: '',
    email: '',
    password: '',
    department: '',
    enrollment_year: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API_URL}/students`);
      setStudents(response.data);
    } catch (error) {
      showMessage('error', 'Failed to fetch students');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/students`, formData);
      setStudents([response.data, ...students]);
      setFormData({
        student_id: '',
        name: '',
        email: '',
        password: '',
        department: '',
        enrollment_year: ''
      });
      showMessage('success', 'Student registered successfully!');
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    
    try {
      await axios.delete(`${API_URL}/students/${studentId}`);
      setStudents(students.filter(s => s.student_id !== studentId));
      showMessage('success', 'Student deleted successfully');
    } catch (error) {
      showMessage('error', 'Failed to delete student');
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Student Data Management System</h1>
      
      {message.text && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'}`}>
          {message.text}
        </div>
      )}

      <div className="row">
        <div className="col-md-5">
          <div className="card">
            <div className="card-header">
              <h3>Register New Student</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Student ID</label>
                  <input
                    type="text"
                    className="form-control"
                    name="student_id"
                    value={formData.student_id}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength="6"
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Department</label>
                  <select
                    className="form-control"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Department</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                  </select>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Enrollment Year</label>
                  <input
                    type="number"
                    className="form-control"
                    name="enrollment_year"
                    value={formData.enrollment_year}
                    onChange={handleChange}
                    min="2000"
                    max="2024"
                    required
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Registering...' : 'Register Student'}
                </button>
              </form>
            </div>
          </div>
        </div>
        
        <div className="col-md-7">
          <div className="card">
            <div className="card-header">
              <h3>Student List</h3>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Year</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => (
                      <tr key={student.student_id}>
                        <td>{student.student_id}</td>
                        <td>{student.name}</td>
                        <td>{student.email}</td>
                        <td>{student.department}</td>
                        <td>{student.enrollment_year}</td>
                        <td>
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(student.student_id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
```

## **Step 5: Docker Configuration**

### **backend/Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

USER node

CMD ["node", "src/server.js"]
```

### **frontend/Dockerfile**
```dockerfile
# Build stage
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### **frontend/nginx.conf**
```nginx
server {
    listen 80;
    server_name localhost;
    
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## **Step 6: Docker Compose for Local Development**

### **docker-compose.yml**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: student-db
    environment:
      POSTGRES_DB: studentdb
      POSTGRES_USER: studentuser
      POSTGRES_PASSWORD: studentpass123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U studentuser"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    container_name: student-backend
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: studentuser
      DB_PASSWORD: studentpass123
      DB_NAME: studentdb
      PORT: 3000
      NODE_ENV: development
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - /app/node_modules
    command: npm run dev

  frontend:
    build: ./frontend
    container_name: student-frontend
    ports:
      - "80:80"
    environment:
      REACT_APP_API_URL: http://localhost/api
    depends_on:
      - backend

volumes:
  postgres_data:
```

## **Step 7: Kubernetes Deployment**

### **k8s/namespace.yaml**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: student-system
```

### **k8s/secrets.yaml**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
  namespace: student-system
type: Opaque
data:
  username: c3R1ZGVudHVzZXI=  # studentuser (base64)
  password: c3R1ZGVudHBhc3MxMjM=  # studentpass123 (base64)
  database: c3R1ZGVudGRi  # studentdb (base64)
```

### **k8s/postgres-deploy.yaml**
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: student-system
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: student-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: database
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        - name: init-sql
          mountPath: /docker-entrypoint-initdb.d
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - studentuser
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - studentuser
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
      - name: init-sql
        configMap:
          name: postgres-init
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: student-system
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

### **k8s/backend-deploy.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: student-system
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: student-backend:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
        env:
        - name: DB_HOST
          value: postgres
        - name: DB_PORT
          value: "5432"
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
        - name: DB_NAME
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: database
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: student-system
spec:
  selector:
    app: backend
  ports:
  - port: 3000
    targetPort: 3000
```

### **k8s/frontend-deploy.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: student-system
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: student-frontend:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 80
        env:
        - name: REACT_APP_API_URL
          value: /api
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: student-system
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

### **k8s/ingress.yaml**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: student-ingress
  namespace: student-system
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  rules:
  - host: student.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 3000
```

## **Step 8: CI/CD Pipeline (Jenkins)**

### **ci-cd/jenkinsfile**
```groovy
pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = 'your-registry.com'
        BACKEND_IMAGE = "${DOCKER_REGISTRY}/student-backend:${BUILD_NUMBER}"
        FRONTEND_IMAGE = "${DOCKER_REGISTRY}/student-frontend:${BUILD_NUMBER}"
        KUBECONFIG = credentials('kubeconfig')
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build Backend') {
            steps {
                dir('backend') {
                    sh 'npm ci'
                    sh 'npm test'
                    sh "docker build -t ${BACKEND_IMAGE} ."
                }
            }
        }
        
        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npm test'
                    sh "docker build -t ${FRONTEND_IMAGE} ."
                }
            }
        }
        
        stage('Push Images') {
            steps {
                sh "docker push ${BACKEND_IMAGE}"
                sh "docker push ${FRONTEND_IMAGE}"
            }
        }
        
        stage('Deploy to Kubernetes') {
            steps {
                script {
                    sh """
                        kubectl set image deployment/backend backend=${BACKEND_IMAGE} -n student-system
                        kubectl set image deployment/frontend frontend=${FRONTEND_IMAGE} -n student-system
                        kubectl rollout status deployment/backend -n student-system
                        kubectl rollout status deployment/frontend -n student-system
                    """
                }
            }
        }
        
        stage('Health Check') {
            steps {
                script {
                    sh '''
                        sleep 10
                        kubectl get pods -n student-system
                        curl -f http://student.local/api/health || exit 1
                    '''
                }
            }
        }
    }
    
    post {
        success {
            echo 'Deployment successful!'
        }
        failure {
            echo 'Deployment failed! Rolling back...'
            script {
                sh 'kubectl rollout undo deployment/backend -n student-system'
                sh 'kubectl rollout undo deployment/frontend -n student-system'
            }
        }
    }
}
```

## **Step 9: Monitoring Setup**

### **monitoring/prometheus.yml**
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
    - role: pod
    relabel_configs:
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
      action: keep
      regex: true
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
      action: replace
      target_label: __metrics_path__
      regex: (.+)
    - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
      action: replace
      regex: ([^:]+)(?::\d+)?;(\d+)
      replacement: $1:$2
      target_label: __address__
```

## **Step 10: Deploy the Application**

### **Local Development**
```bash
# Clone the repository
git clone https://github.com/your-repo/student-management-system.git
cd student-management-system

# Start with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f

# Access the application
# Frontend: http://localhost
# Backend API: http://localhost/api
```

### **Kubernetes Deployment**
```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create configmap for init SQL
kubectl create configmap postgres-init --from-file=database/init.sql -n student-system

# Apply secrets and deployments
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres-deploy.yaml
kubectl apply -f k8s/backend-deploy.yaml
kubectl apply -f k8s/frontend-deploy.yaml
kubectl apply -f k8s/ingress.yaml

# Check status
kubectl get all -n student-system
kubectl get pods -n student-system -w
```

### **Testing the Application**
```bash
# Test backend API
curl -X POST http://localhost/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "STU001",
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "department": "Computer Science",
    "enrollment_year": 2023
  }'

# Get all students
curl http://localhost/api/students

# Health check
curl http://localhost/api/health
```

## **Step 11: Monitoring & Observability**

### **Access Metrics**
```bash
# Port-forward Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Port-forward Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000
```

## **Production Best Practices Implemented**

✅ **Zero-downtime deployments** with RollingUpdate strategy  
✅ **Health checks** (liveness & readiness probes)  
✅ **Resource limits** to prevent resource exhaustion  
✅ **Secrets management** for sensitive data  
✅ **Persistent storage** for database  
✅ **Load balancing** with Kubernetes Services  
✅ **Ingress** for external access  
✅ **CI/CD pipeline** with automated testing  
✅ **Rollback capability** on failure  
✅ **Monitoring** with Prometheus & Grafana  
✅ **Structured logging** with Winston  
✅ **Input validation** with Joi  
✅ **Password hashing** with bcrypt  
✅ **Database indexing** for performance  

## **Next Steps**

1. **Set up Git repository** with this structure
2. **Install Docker** and Kubernetes (Minikube for local)
3. **Run locally** with Docker Compose
4. **Deploy to Kubernetes**
5. **Configure CI/CD** (Jenkins/GitLab CI)
6. **Set up monitoring** stack
7. **Implement SSL/TLS** with cert-manager

This complete setup gives you a production-ready 3-tier application with proper DevOps practices. The system allows students to register, view, and manage their data with full CI/CD pipeline and monitoring capabilities.

Would you like me to explain any specific part in more detail or help you with the deployment?