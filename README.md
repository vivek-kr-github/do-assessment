**Application - SSL Certificate Checker:**
A web application that fetches SSL certificate details for any website.
Built using Node.js (Backend), Nginx (Frontend), Kubernetes (DOKS), and DigitalOcean Managed MongoDB.

**URL:https://ssl-checker.vivekkr.online/**

![image](https://github.com/user-attachments/assets/c70e476d-8f4b-4dc2-806e-71d7292d1d4e)


**Use of the Website**
This web application allows users to retrieve SSL certificate details for any website by simply entering a URL which prevents certificate outages. It provides key SSL certificate information such as:
* Issuer (Who issued the certificate?)
* Validity Period (Start and expiry dates)
* Serial Number (Unique identifier of the certificate)
* Subject (Website it is issued for)
  
For instance, enterprise organizations like Microsoft and Cisco have recently experienced certificate outages. A monitoring tool like this would help customers prevent such issues.

**Project Structure:**
📁 /ssl-checker (Root)
Centralized project directory for managing backend, frontend, and Kubernetes configurations.
📂 backend/ (Node.js API for SSL certificate fetching)
server.js → Express API that fetches SSL certificate details from a given domain.
package.json → Manages dependencies (e.g., express, axios, mongoose).
Dockerfile → Defines the containerized environment for the backend service.
📂 frontend/ (Nginx Static Frontend)
index.html → Simple UI for user input (enter website URL).
nginx.conf → Configures Nginx to:
Serve static assets.
Reverse-proxy requests to the backend API.
Dockerfile → Builds and serves the frontend using Nginx.
📂 kubernetes/ (Kubernetes Deployment Files)
namespaces.yaml → Defines namespaces for isolating services.
backend-deployment.yaml → Deploys the Node.js API with necessary resources and environment settings.
frontend-deployment.yaml → Deploys the Nginx frontend service.
mongodb-secret.yaml → Stores sensitive MongoDB credentials as Kubernetes secrets.
hpa.yaml → Horizontal Pod Autoscaler (HPA) config for auto-scaling based on CPU/memory usage.
namespace.yaml → Namespace definition (ensure this is referenced in other YAML files).
docker-compose.yaml → Useful for local development/testing of services.

**Deployment Guide:**
**Step 1: Create a Jump Server in DigitalOcean Droplet**

A Jump Server (or Bastion Host) is an intermediary server that helps secure access to your infrastructure.
1.1 Create a Droplet
Log in to DigitalOcean.
Click on Create → Droplets.
Choose an image: Ubuntu 22.04 (or the latest version).
Choose a plan: A basic droplet with at least 1GB RAM is recommended.
Select a data center region(I choose Bangalore)
Add SSH keys for authentication.
Click Create Droplet.

1.2 Configure the Jump Server
SSH into your droplet:
ssh root@your_droplet_ip
sudo apt update && sudo apt upgrade -y
mkdir /root/ssl-checker

**Step 2: Set Up Backend with Node.js**

Your server.js handles fetching SSL certificates.

2.1 Install Node.js and Dependencies
curl -fsSL https://deb.nodesource.com/setup_21.x | sudo -E bash -
sudo apt install -y nodejs

2.2 Create server.js & package.json 
cd /root/ssl-checker/
mkdir backend
cd /root/ssl-checker/backend/
vi server.js & paste the following

_const express = require('express');
const tls = require('tls');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = 5000;

// MongoDB Connection (Managed MongoDB on DigitalOcean)
const MONGO_URI = "mongodb+srv://doadmin:4N2db95jIKFy6318@private-ssl-mongodb-ec84c3c5.mongo.ondigitalocean.com/admin?tls=true&authSource=admin&replicaSet=ssl-mongodb";

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ Connected to Managed MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Define Schema for SSL Certificates
const certificateSchema = new mongoose.Schema({
    domain: String,
    issuer: String,
    valid_from: String,
    valid_to: String,
    serial_number: String,
    subject: String,
    fetched_at: { type: Date, default: Date.now } // Timestamp of fetch
});

// Create MongoDB Model
const Certificate = mongoose.model('Certificate', certificateSchema);

// Fetch SSL Certificate Details API with SNI
app.post('/get-certificate', async (req, res) => {
    const websiteUrl = req.body.url.replace(/^https?:\/\//, '').split('/')[0];

    const options = {
        host: websiteUrl,
        port: 443,
        servername: websiteUrl, // Required for SNI
        rejectUnauthorized: false
    };

    const reqTls = tls.connect(options, async () => {
        const cert = reqTls.getPeerCertificate();
        if (cert && Object.keys(cert).length > 0) {
            const certData = {
                domain: websiteUrl,
                issuer: cert.issuer.O,
                valid_from: cert.valid_from,
                valid_to: cert.valid_to,
                serial_number: cert.serialNumber,
                subject: cert.subject.O
            };

            // Save to MongoDB
            try {
                await Certificate.create(certData);
                console.log(`✅ Certificate stored in MongoDB for ${websiteUrl}`);
            } catch (err) {
                console.error("❌ MongoDB Insert Error:", err);
            }

            res.json(certData);
        } else {
            res.status(500).json({ error: "Could not fetch certificate" });
        }
        reqTls.end();
    });

    reqTls.on('error', (error) => {
        res.status(500).json({ error: "Invalid URL or No SSL certificate found", details: error.message });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
_

save & exit the file

cd /root/ssl-checker/backend/
vi package.json & paste the following

_{
  "name": "ssl-checker",
  "version": "1.0.0",
  "description": "Fetch SSL certificate details for user-entered websites",
  "main": "server.js",
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0"
  },
  "scripts": {
    "start": "node server.js"
  }
}
_
save & exit the file

**Step 3: Setup Frontend and Nginx**

Your index.html serves as the frontend UI.
3.1 Install Nginx
sudo apt install nginx -y

3.2 Configure index.html & nginx.conf
cd /root/ssl-checker/
mkdir frontend
cd /root/ssl-checker/frontend/
vi index.html & paste the following

_<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SSL Certificate Checker</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        input { padding: 10px; width: 300px; }
        button { padding: 10px; cursor: pointer; }
        pre { text-align: left; background: #f4f4f4; padding: 10px; width: 60%; margin: auto; border-radius: 5px; }
    </style>
</head>
<body>
    <h2>SSL Certificate Checker</h2>
    <input type="text" id="website-url" placeholder="Enter Website URL (e.g., https://example.com)">
    <button onclick="fetchCertificate()">Check SSL</button>
    <h3>Certificate Details:</h3>
    <pre id="output">No Data</pre>

    <script>
        async function fetchCertificate() {
            const url = document.getElementById("website-url").value;
            if (!url) {
                alert("Please enter a valid URL.");
                return;
            }

            try {
                const response = await fetch('/get-certificate', {
                    method: 'POST',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url })
                });
                const data = await response.json();
                document.getElementById("output").textContent = JSON.stringify(data, null, 4);
            } catch (error) {
                document.getElementById("output").textContent = "Error fetching certificate details.";
            }
        }
    </script>
</body>
</html>
_
save & exit the file

cd /root/ssl-checker/frontend/
vi nginx.conf & paste the following

_worker_processes auto;
events {
    worker_connections 1024;
}
http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    sendfile on;
    keepalive_timeout 65;
    resolver kube-dns.kube-system.svc.cluster.local valid=10s ipv6=off;

    server {
        listen 80;
        server_name localhost;

        location / {
            root /usr/share/nginx/html;
            index index.html;
            try_files $uri /index.html;
        }

        location /get-certificate {
            set $backend_api $BACKEND_URL;
            proxy_pass $backend_api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}_

**Step 4: Create Managed MongoDB in DigitalOcean**
-> Go to DigitalOcean Console → Databases.
-> Click Create Database → Choose MongoDB.
-> Select a region and cluster size.
-> Copy the MongoDB Connection String (something like mongodb+srv://user:password@cluster.mongodb.net/dbname)
-> Make sure to copy/replace the Mongodb connection string in server.js for backend service

**Step 5: Manually Test the Application**
Start the Backend by executing _node server.js_
Access the Frontend: Open http://your_droplet_public_ip in a browser.
Enter a website URL and check the SSL details

**Step 6: Containerizing with Docker**
6.1 Install Docker & Docker compose
sudo apt install docker.io docker-compose -y
sudo systemctl enable

6.2 Create docker file for both backend & frontend in respective directories 

/root/ssl-checker/backend/Dockerfile
_# Use Node.js as base image
FROM node:21

# Set working directory inside container
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy application source code
COPY . .

# Expose port 5000
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]_


/root/ssl-checker/frontend/Dockerfile
_# Use Nginx as base image
FROM nginx:latest

# Copy static frontend files
COPY index.html /usr/share/nginx/html/index.html

# Copy custom Nginx config with placeholders
COPY nginx.conf /etc/nginx/templates/nginx.conf.template

# Replace env variables and start Nginx properly
CMD ["/bin/sh", "-c", "envsubst '$BACKEND_URL' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/nginx.conf && exec nginx -g 'daemon off;'"]

EXPOSE 80
_

**Step 7: Docker compose to test the application in docker**

vi /root/ssl-checker/docker-compose.yml
_version: "3.8"

services:
  backend:
    build: ./backend
    container_name: ssl-checker-backend
    ports:
      - "5000:5000"
    networks:
      - app-network

  frontend:
    build: ./frontend
    container_name: ssl-checker-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
_

Build and Run the Containers by executing _docker-compose up --build_
Verify Running Containers by executing _docker ps_

**Step 8: Test the Application in docker compose**
Start the Backend by executing _curl -X POST http://localhost:5000/get-certificate \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com"}'_
Access the Frontend: Open http://your_droplet_public_ip in a browser.
Enter a website URL and check the SSL details

**Step 9: Build & Push Docker Images to DigitalOcean Container Registry**
9.1 Install doctl by executing _snap install doctl_

9.2 Authenticate with your DigitalOcean account by executing _doctl auth init_

9.3 Authenticate with your container registry using API token by executing _docker login registry.digitalocean.com_ && You will be asked for a username then a password, this is where the API Token comes in. Use your registered email as the username and paste the token as the password to authenticate. Create token in _DigitalOcean UI -> API -> Tokens_

9.4 Create a DigitalOcean Container Registry by executing _doctl registry create ssl-checker-registry_

9.5 Tag & Push Docker backend Images
_cd /root/ssl-checker/backend/
docker tag ssl-checker-backend registry.digitalocean.com/ssl-checker-registry/ssl-checker-backend:latest
docker push registry.digitalocean.com/ssl-checker-registry/ssl-checker-backend:latest_

9.5 Tag & Push Docker frontend Images
_cd /root/ssl-checker/frontend/
docker tag ssl-checker-frontend registry.digitalocean.com/ssl-checker-registry/ssl-checker-frontend:latest
docker push registry.digitalocean.com/ssl-checker-registry/ssl-checker-frontend:latest_

**Step 10: Deploy to DigitalOcean Kubernetes (DOKS)**
Create a Kubernetes Cluster
_doctl kubernetes cluster create ssl-checker-cluster --region bglr --size s-2vcpu-4gb --count 2_ #make sure autoscaling is enabled)
_doctl kubernetes cluster kubeconfig save ssl-checker-cluster_ #to save kube config in jump host
_kubectl get nodes_ #to verify the cluster

**Step 11: Create Kubernetes Deployment & Service YAML**
Create yaml as directory in mkdir /root/ssl-checker/yaml & past the below yaml files
11.1 Store MongoDB Credentials as Kubernetes Secrets by create mongodb-secret.yaml use base64 encode value of MongoDB connection string

vi mongodb-secret.yaml 
_apiVersion: v1
kind: Secret
metadata:
  name: mongodb-secret
  namespace: backend #use the same namespace as the backend
type: Opaque
data:
  mongo-uri: "bW9uZ29kYitzcnY6Ly9kb2FkbWluOjROMmRiOTVqSUtGeTYzMThAcHJpdmF0ZS1zc2wtbW9uZ29kYi1lYzg0YzNjNS5tb25nby5vbmRpZ2l0YWxvY2Vhbi5jb20vYWRtaW4/dGxzPXRydWUmYXV0aFNvdXJjZT1hZG1pbiZyZXBsaWNhU2V0PXNzbC1tb25nb2Ri"_

Save & exit the file

vi namespaces.yaml
__apiVersion: v1
kind: Namespace
metadata:
  name: backend

---
apiVersion: v1
kind: Namespace
metadata:
  name: frontend

---_
Save & exit the file

vi backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: backend
spec:
  replicas: 2
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
          image: registry.digitalocean.com/ssl-checker-registry/ssl-checker-backend:latest
          ports:
            - containerPort: 5000
          env:
            - name: MONGO_URI
              valueFrom:
                secretKeyRef:
                  name: mongodb-secret
                  key: mongo-uri


---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: backend
spec:
  selector:
    app: backend
  ports:
    - protocol: TCP
      port: 5000
      targetPort: 5000
  type: ClusterIP_

vi frontend-deployment.yaml
_apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      dnsPolicy: ClusterFirst  # Ensure correct DNS settings
      containers:
        - name: frontend
          image: registry.digitalocean.com/ssl-checker-registry/ssl-checker-frontend:latest
          ports:
            - containerPort: 80
          env:
            - name: BACKEND_URL
              value: "http://backend-service.backend.svc.cluster.local:5000"  # Inject backend URL into the environment
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: frontend
  annotations:
    service.beta.kubernetes.io/do-loadbalancer-certificate-id: "4eb12c9c-c6ba-4cf9-bdf8-d185c9c1b6aa" --> use the certificate ID, refer step 14
    service.beta.kubernetes.io/do-loadbalancer-protocol: "https"
spec:
  selector:
    app: frontend
  ports:
    - protocol: TCP
      port: 443
      targetPort: 80 #Nginx is running on port 80
  type: LoadBalancer
_
Save & exit the file

vi hpa.yaml
_apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: backend  # Use backend namespace
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 50

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
  namespace: frontend  # Use frontend namespace
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 50_
Save & exit the file

**Step 12: Deploy to DigitalOcean Kubernetes**
12.1 Apply the YAML files:
kubectl apply -f mongodb-secrets.yaml
kubectl apply -f namespaces.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f hpa.yaml

12.2 Check if the pods, deployment are running:
kubectl get pods -A
kubectl get deployments -A

**Step 13: DEPLOYMENT COMPLETED TEST THE APPLICATION USING LOADBALANCER IP OF FRONTEND SERVICE**
Execute **kubectl get svc -n frontend** from the output copy the external IP and access in the browser

**Step 14: SSL offload the load balancer with Lets Encrypt for security**
14.1 Create a Lets Encrypt SSL certificate in _DigitalOcean UI -> Settings -> Security -> Certificates for Load Balancers and Spaces_
14.2 Execute _doctl compute certificate list_ to find certificate ID & change it in frontend_deployment.yaml
14.3 Execute _kubectl apply -f frontend-deployment.yaml_
14.4 Execute _kubectl rollout restart deployment frontend -n frontend_
14.5 Create a domain in _DigitalOcean UI -> Networking -> Domains_
14.6 Make sure the loadbalancer IP is directed to the A record & also for the SSL Certificates

![image](https://github.com/user-attachments/assets/51ec66da-ba95-4077-b8b6-a1ac60a791e4)
