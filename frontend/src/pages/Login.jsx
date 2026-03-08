import { useState } from "react";
import axios from "axios";

function Login({ setUser }) {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = () => {

    axios.post("http://localhost:4567/login", {
      email: email,
      password: password
    })
    .then(res => {

      const token = res.data.token;
      const role = res.data.role;

      localStorage.setItem("token", token);
      localStorage.setItem("role", role);

      setUser({ role });

    })
    .catch(() => {
      alert("Invalid credentials");
    });

  };

  return (
    <div style={{padding:"40px"}}>

      <h2>Warehouse Login</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />

      <br/><br/>

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      <br/><br/>

      <button onClick={login}>
        Login
      </button>

    </div>
  );

}

export default Login;
