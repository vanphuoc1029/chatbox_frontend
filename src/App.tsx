import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
type Message = {
  userId: {
    username: string;
  };
  content: string;
};
type User = {
  id: number;
  username: string;
  password: string;
};

const getAllMessage = async () => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_BASE_URL}/message/all`
    );
    const messages: Message[] = await response.json();
    return messages;
  } catch (error) {
    console.error(error);
  }
};

const login = async (username: string, password: string) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_BASE_URL}/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      }
    );
    console.log(response);
    if (response.status === 404) {
      alert("User not found");
      return null;
    }
    if (response.status === 401) {
      alert("Invalid username or password");
      return null;
    }
    if (!response.ok) {
      console.error("Login failed with status:", response.status);
      return null;
    }
    const user: User = await response.json();
    return user;
  } catch (error) {
    console.error(error);
    return null;
  }
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [input, setInput] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isSendButtonDisabled, setIsSendButtonDisabled] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (user) {
      const newSocket = io(import.meta.env.VITE_BASE_URL);
      setSocket(newSocket);

      newSocket.on("message", (message: Message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  useEffect(() => {
    const fetchMessages = async () => {
      if (user) {
        const fetchedMessages = await getAllMessage();
        if (fetchedMessages) {
          setMessages(fetchedMessages);
        }
      }
    };
    fetchMessages();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      alert("You need to login first");
      return;
    }
    setIsSendButtonDisabled(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BASE_URL}/message/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: input, userId: user.id, roomId: 1 }),
        }
      );
      if (response.ok) {
        const newMessage: Message = {
          userId: { username: user.username },
          content: input,
        };
        setInput("");
        socket?.emit("message", newMessage);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => {
        setIsSendButtonDisabled(false);
      }, 100);
    }
  };

  const onRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    console.log(form);
    const username = form.username.value;
    const password = form.password.value;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BASE_URL}/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        }
      );
      if (response.ok) {
        alert("User created successfully");
        form.username.value = "";
        form.password.value = "";
      }
    } catch (error) {
      console.error(error);
      alert("User creation failed");
    }
  };

  return (
    <div>
      <div style={{ padding: "10px", paddingBottom: "5px" }}>
        <h3>Login</h3>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const user = await login(form.username.value, form.password.value);
            if (user) {
              setUser(user);
            }
          }}
        >
          <input
            type="text"
            placeholder="username"
            name="username"
            style={{ marginRight: "5px" }}
          />
          <input
            type="password"
            placeholder="password"
            name="password"
            style={{ marginRight: "5px" }}
          />
          <button type="submit">Login</button>
        </form>
      </div>
      <div style={{ padding: "10px", paddingBottom: "5px" }}>
        <h3>Register</h3>
        <form onSubmit={onRegisterSubmit}>
          <input
            type="text"
            placeholder="username"
            name="username"
            style={{ marginRight: "5px" }}
          />
          <input
            type="password"
            placeholder="password"
            name="password"
            style={{ marginRight: "5px" }}
          />
          <button type="submit">Register</button>
        </form>
      </div>
      <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
        <h1>Chat Box</h1>
        <div
          ref={chatContainerRef}
          style={{
            border: "1px solid #ccc",
            padding: "10px",
            height: "300px",
            width: "500px",
            overflowY: "scroll",
            marginBottom: "10px",
          }}
        >
          {messages.map((message, index) => (
            <div key={index} style={{ padding: "5px 0" }}>
              {message.userId.username}: {message.content}
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ flex: 1, padding: "10px", fontSize: "16px" }}
            placeholder={user ? "Type your message" : "Login to send message"}
            disabled={!user}
          />
          <button
            type="submit"
            style={{ padding: "10px 20px", fontSize: "16px" }}
            disabled={!user || isSendButtonDisabled}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
