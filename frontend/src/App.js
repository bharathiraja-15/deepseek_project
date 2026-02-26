import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

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
    <div className="main-bg">
      <div className="container py-5">

        <h1 className="dashboard-title">🎓 Student Management Dashboard</h1>

        {/* Stats Cards */}
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="stats-card">
              <h4>Total Students</h4>
              <h2>{students.length}</h2>
            </div>
          </div>
          <div className="col-md-4">
            <div className="stats-card">
              <h4>Departments</h4>
              <h2>5</h2>
            </div>
          </div>
          <div className="col-md-4">
            <div className="stats-card">
              <h4>Enrollment Year</h4>
              <h2>2024</h2>
            </div>
          </div>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'}`}>
            {message.text}
          </div>
        )}

        <div className="row">
          {/* Form Section */}
          <div className="col-md-5">
            <div className="card custom-card">
              <div className="card-header custom-header">
                Register New Student
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <input type="text" className="form-control mb-3"
                    placeholder="Student ID"
                    name="student_id"
                    value={formData.student_id}
                    onChange={handleChange}
                    required />

                  <input type="text" className="form-control mb-3"
                    placeholder="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required />

                  <input type="email" className="form-control mb-3"
                    placeholder="Email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required />

                  <input type="password" className="form-control mb-3"
                    placeholder="Password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required />

                  <select className="form-control mb-3"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    required>
                    <option value="">Select Department</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                  </select>

                  <input type="number" className="form-control mb-3"
                    placeholder="Enrollment Year"
                    name="enrollment_year"
                    value={formData.enrollment_year}
                    onChange={handleChange}
                    required />

                  <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                    {loading ? 'Registering...' : 'Register Student'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="col-md-7">
            <div className="card custom-card">
              <div className="card-header custom-header">
                Student List
              </div>
              <div className="card-body table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Year</th>
                      <th>Action</th>
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
                            onClick={() => handleDelete(student.student_id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {students.length === 0 && (
                  <p className="text-center mt-3">No students registered yet.</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;