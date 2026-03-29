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
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-[#463f3a] mb-[20px] text-[24px]">Warehouse Login</h2>

      <input 
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="p-[5px] rounded-[5px] w-[300px] bg-[#f4f3ee] text-black"
      />

      <br/><br/>

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="p-[5px] rounded-[5px] w-[300px] bg-[#f4f3ee] text-black"
      />

      <br/><br/>

      <button onClick={login} className="bg-[#e0afa0] text-[#463f3a] w-[150px]">
        Login
      </button>

    </div>
  );

}

export default Login;


