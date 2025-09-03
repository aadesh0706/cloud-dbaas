# 📊 How to Use Prometheus in Your DBaaS Platform

## 🚀 **Quick Access**

- **Prometheus Dashboard**: http://localhost:9090
- **Backend Metrics**: http://localhost:5000/metrics
- **Grafana Dashboard**: http://localhost:3001

## 📈 **Understanding Prometheus**

Prometheus is a monitoring and alerting system that collects metrics from your applications and stores them in a time-series database.

### **Key Concepts:**

1. **Metrics**: Numerical data points (e.g., CPU usage, request count)
2. **Labels**: Key-value pairs that add dimensions to metrics
3. **Scraping**: Process of collecting metrics from endpoints
4. **Queries**: PromQL language to retrieve and analyze data
5. **Targets**: Services that Prometheus monitors

## 🔧 **Current Setup**

### **Configured Targets:**
- ✅ **DBaaS Backend** (`backend:5000/metrics`)  
- ✅ **Prometheus itself** (`localhost:9090`)
- 🔄 **Database Services** (MySQL, MongoDB, Redis)

### **Available Metrics from Backend:**
```
# HTTP Requests
http_requests_total                # Total HTTP requests

# System Metrics  
backend_uptime_seconds            # Backend uptime
active_connections               # Current active connections

# Database Operations
database_operations_total{operation,status}  # DB operations by type and status
```

## 🎯 **How to Use Prometheus Web UI**

### **1. Access the Interface**
Go to http://localhost:9090 in your browser

### **2. Basic Queries to Try:**

**Backend Uptime:**
```promql
backend_uptime_seconds
```

**HTTP Request Rate:**
```promql
rate(http_requests_total[5m])
```

**Database Operations by Status:**
```promql
database_operations_total{status="success"}
```

**Database Operations Rate:**
```promql
sum(rate(database_operations_total[5m])) by (operation)
```

### **3. Navigate the UI:**

**🔍 Query Tab:**
- Enter PromQL queries
- View results as table or graph
- Adjust time ranges

**🎯 Targets Tab:**
- See all monitored services
- Check scraping status
- View target health

**⚙️ Configuration Tab:**
- View Prometheus configuration
- Check scraping rules

## 📊 **Advanced PromQL Examples**

### **Performance Monitoring:**
```promql
# Average response time
avg(http_request_duration_seconds)

# Error rate percentage
rate(http_requests_total{status_code=~"5.."}[5m]) / 
rate(http_requests_total[5m]) * 100
```

### **Database Insights:**
```promql
# Database creation success rate
rate(database_operations_total{operation="create",status="success"}[5m])

# Failed database operations
sum(database_operations_total{status="error"})

# Operations by database type
sum(database_operations_total) by (database_type)
```

### **System Health:**
```promql
# Active connections trending up
increase(active_connections[1h])

# Backend availability
up{job="dbaas-backend"}
```

## 📱 **Integration with Grafana**

Your Grafana dashboard (http://localhost:3001) is pre-configured to use Prometheus as a data source.

**Default Login:**
- Username: `admin`
- Password: `admin123`

**Create Beautiful Dashboards:**
1. Go to Grafana → Create Dashboard
2. Add Panel → Select Prometheus as data source
3. Use PromQL queries from above
4. Choose visualization (Graph, Table, Stat, etc.)

## 🚨 **Setting Up Alerts**

### **1. Create Alert Rules in Prometheus:**
Add to `monitoring/prometheus.yml`:
```yaml
rule_files:
  - "alert_rules.yml"
```

### **2. Example Alert Rules:**
Create `monitoring/alert_rules.yml`:
```yaml
groups:
  - name: dbaas_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(database_operations_total{status="error"}[5m]) > 0.1
        for: 5m
        annotations:
          summary: "High database operation error rate"
          
      - alert: BackendDown
        expr: up{job="dbaas-backend"} == 0
        for: 1m
        annotations:
          summary: "Backend service is down"
```

## 🔧 **Adding Custom Metrics**

To add more metrics to your backend, you can extend the `/metrics` endpoint:

```javascript
app.get('/metrics', (req, res) => {
  const metrics = `
# Your existing metrics...

# HELP custom_database_count Total databases created
# TYPE custom_database_count gauge
custom_database_count{type="mysql"} ${getMySQLCount()}
custom_database_count{type="postgresql"} ${getPostgreSQLCount()}

# HELP memory_usage_bytes Current memory usage
# TYPE memory_usage_bytes gauge  
memory_usage_bytes ${process.memoryUsage().heapUsed}
`;
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});
```

## 🎓 **Best Practices**

### **Metric Design:**
- ✅ Use descriptive names with units (`_seconds`, `_bytes`, `_total`)
- ✅ Add meaningful labels for filtering
- ✅ Keep cardinality low (avoid high-cardinality labels)

### **Query Performance:**
- ✅ Use `rate()` for counters
- ✅ Use `increase()` for absolute increases
- ✅ Aggregate with `sum()`, `avg()`, `max()`, `min()`

### **Monitoring Strategy:**
- 📊 **RED Method**: Rate, Errors, Duration
- 📊 **USE Method**: Utilization, Saturation, Errors
- 📊 **Four Golden Signals**: Latency, Traffic, Errors, Saturation

## 🔄 **Common Workflows**

### **1. Troubleshooting Performance:**
1. Check backend uptime: `backend_uptime_seconds`
2. Look for error spikes: `rate(database_operations_total{status="error"}[5m])`
3. Monitor request patterns: `rate(http_requests_total[5m])`

### **2. Capacity Planning:**
1. Track connection growth: `active_connections`
2. Monitor database creation trends: `increase(database_operations_total[1d])`
3. Watch resource utilization patterns

### **3. Service Health Check:**
1. Verify all targets are UP: Go to Status → Targets
2. Check scraping intervals are working
3. Validate metric collection

## 📚 **Learning Resources**

- **PromQL Tutorial**: https://prometheus.io/docs/prometheus/latest/querying/basics/
- **Best Practices**: https://prometheus.io/docs/practices/naming/
- **Grafana Integration**: https://grafana.com/docs/grafana/latest/datasources/prometheus/

## 🚀 **Quick Start Checklist**

- [ ] ✅ Open Prometheus at http://localhost:9090
- [ ] ✅ Check Targets tab - backend should be UP
- [ ] ✅ Try basic query: `backend_uptime_seconds`
- [ ] ✅ View graph visualization
- [ ] ✅ Access Grafana at http://localhost:3001
- [ ] ✅ Create your first dashboard with backend metrics

**Your Prometheus monitoring is now ready! Start exploring the metrics and building dashboards! 📊**
