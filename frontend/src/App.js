import {ReactComponent as Arrow} from './arrow.svg';
import './App.css';
import React, {useState, useEffect} from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { a11yDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

/* eslint-disable no-useless-escape */
/* eslint-disable react-hooks/exhaustive-deps */

const fetch_get = {
  method: "GET",
  mode: "cors",
  credentials: "include",
};

let conversation_id = "";

const FormatResponse = ({ input_text }) => {
  if (!input_text) return null;
  
  const lines = input_text.split("\n");
  const codeBlockPattern = /^\s*```(.*)$/;
  const unorderListPattern = /^[\-*]\s+(.*)$/;
  const orderListPattern = /^\d\.\s+(.*)$/;
  let formattedElements = [];
  let listItems = [];
  let nomralItems = [];
  let codeLines = [];
  let lastMatched = [];
  
  const flushNormalItems = () => {
    if (nomralItems.length) {
      if (nomralItems[0].trim() === "") { nomralItems.shift(); }
      if (nomralItems.length === 0) { return; }
      nomralItems[0] = nomralItems[0].trimStart();
      formattedElements.push(
        <MathJax key={formattedElements.length} dynamic>
          {nomralItems.join("\n")}
        </MathJax>
      );
      nomralItems = [];
    }
  }

  const flushCodeItems = () => {
    flushNormalItems();
    if (codeLines.length) {
      lastMatched.pop();
      const tempResult = codeBlockPattern.exec(codeLines[0]);
      const language = tempResult ? tempResult[1] : "";
      const new_block = (
        <SyntaxHighlighter key={formattedElements.length} language={language} style={a11yDark} customStyle={{fontSize: "small", marginLeft: "auto", marginRight: "auto", width: "80%"}} wrapLongLines={true} >
          {codeLines.slice(1, codeLines.length-1).join("\n")}
        </SyntaxHighlighter>
      );
      if (lastMatched.length && (lastMatched[lastMatched.length - 1] === "ul" || lastMatched[lastMatched.length - 1] === "ol")) {
        listItems[listItems.length - 1] = (<>{listItems[listItems.length - 1]}{new_block}</>);
      }
      else {
        formattedElements.push(new_block);
      }
      codeLines = [];
    }
  }

  const flushListItems = () => {
    flushNormalItems();
    if (listItems.length) {
      if (lastMatched[lastMatched.length - 1] === "ul") {
        formattedElements.push(
          <ul key={formattedElements.length}>
            {listItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        );
      }
      else if (lastMatched[lastMatched.length - 1] === "ol") {
        formattedElements.push(
          <ol key={formattedElements.length}>
            {listItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ol>
        );
      }
      listItems = [];
      lastMatched.pop();
    }
  }

  lines.forEach((line, index) => {
    // If code block start is already found
    if (lastMatched[lastMatched.length - 1] === "code") {
      // If code block end found
      if (codeBlockPattern.test(line.trim())) {
        codeLines.push(line);
        flushCodeItems();
      }
      else {
        codeLines.push(line);
      }
      return;
    }
    // If start of code block found
    if (codeBlockPattern.test(line.trim())) {
      lastMatched.push("code");
      codeLines.push(line);
    }
    else if (unorderListPattern.test(line.trim())) {
      if (lastMatched[lastMatched.length - 1] !== "ul") {
        lastMatched.push("ul");
      }
      listItems.push(line.trim().replace(/^[\-*]\s+/, ""));
    }
    else if (orderListPattern.test(line.trim())) {
      if (lastMatched[lastMatched.length - 1] !== "ol") {
        lastMatched.push("ol");
      }
      listItems.push(line.trim().replace(/^\d\.\s+/, ""));
    }
    else {
      if (line.trim() === "") { return; }
      if (lastMatched.length) { flushListItems(); }
      nomralItems.push(line);
    }
  })
  flushListItems();
  flushNormalItems();
  return formattedElements;
}

const MenuItem = ({setMessage, title, id}) => {
  function click(e) {
    e.preventDefault();
    let new_conversation_id = e.target.getAttribute("data-value");
    conversation_id = new_conversation_id;
    fetch(("http://127.0.0.1:8080/conversation/" + new_conversation_id), fetch_get).then(res => {
      res.json().then(data => {
        setMessage(data.messages);
      });
    }).catch(err => {
      console.log("Failed to retrieve conversation");
      console.error(err);
    });

  }

  return (
    <div className="menu_item" onClick={click} data-value={id}>
      <span data-value={id}>{title}</span>
    </div>
  )
}

const LeftBar = ({setMessage, loginState, setLoginState}) => {
  const [username, setUsername] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (loginState) { return; }
    fetch("http://127.0.0.1:8080/username", fetch_get).then(res => {
      res.text().then(data => {
        if (data !== "") {
          setUsername(data);
          setLoginState(true);
        }
      });
    }).catch(err=>{
      console.log("Failed to retrieve username");
      console.error(err);
    });
  });

  useEffect(()=>{
    fetch("http://127.0.0.1:8080/history", fetch_get).then(res => {
      res.json().then(data => {
        setHistory(data);
      });
    }).catch(err=>{
      console.log("Failed to retrieve history");
      console.error(err);
    });
  }, [loginState]);

  const handleLogin = () => {
    window.location.href = "http://127.0.0.1:8080/oauth2/login";
  }

  const handleNewChat = (e) => {
    e.preventDefault();
    conversation_id = "";
    setMessage([]);
  }

  return (
    <div className="full_height flex flex_col Left_Menu">
      <div>
        <a href={window.location.origin} onClick={handleNewChat} className={"new_chat"} style={{display:'flex', height:"2.5rem"}}>
          <div style={{paddingRight: "5px"}}>
            <img className=" h2/3" src="chatgpt.svg" alt="logo"/>
          </div>
          New Chat
        </a>
      </div>
      <div className="hundred full_width content_menu">
        {history.map((item, index) => {
          return (
            <MenuItem key={index} setMessage={setMessage} title={item.title} id={item.id}/>
          )
        })}
      </div>
      <div className="flex_col flex account">
        {username ? <span>{username}</span>: <button onClick={handleLogin} type="button">Log in</button>}
      </div>
    </div>
    
  )
}

const BottomBar = ({message, setMessage}) => {
  const [question, setQuestion] = useState("");
  const [attachment, setAttachment] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let chatbox = document.getElementById("chatbox");
    chatbox.style.height = "0px";
    let padding_top = parseInt(window.getComputedStyle(chatbox, null).paddingTop);
    let padding_bottom = parseInt(window.getComputedStyle(chatbox, null).paddingBottom);
    let content_row = ~~((chatbox.scrollHeight - padding_top - padding_bottom) / parseInt(window.getComputedStyle(chatbox, null).lineHeight));
    let new_row;
    if (content_row < 4) {
      new_row = content_row;
      chatbox.style.scrollbarWidth = "none";
    }
    else {
      new_row = 4;
      chatbox.style.scrollbarWidth = "auto";
    }
    let new_height = new_row * parseInt(window.getComputedStyle(chatbox).lineHeight) +"px";
    chatbox.style.height = new_height;
  }, [question]);

  async function getConversationId() {
    let res = await fetch("http://127.0.0.1:8080/new_chat", fetch_get).catch(err => {console.log("Failed to create new chat"); console.error(err);})
    let data = await res.json();
    conversation_id = data.id;
  }

  async function submit(e) {
    if (e.type === "keydown" && !(e.key === "Enter" && !e.shiftKey)) { return; }
    if (uploading) { return; }
    e.preventDefault();
    if (question === "") { return; }
    let res_text = "";
    let user_question = question;
    let old_message;
    if (attachment.length) {
      old_message = message.concat([{role: "user", content: [{type: "text", text: user_question}].concat(attachment)}]);
    }
    else {
      old_message = message.concat([{role: "user", content: user_question}]);
    }
    setMessage(old_message);
    setQuestion("");
    if (conversation_id === "") {
      await getConversationId();
    }
    let res = await fetch("http://127.0.0.1:8080/api/request", {
      method: "POST",
      mode: "cors",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: old_message,
        chatId: conversation_id,
      })
    }).catch(err => {
      console.log("Failed to send message");
      console.error(err);
    })
    for await (const chunk of res.body) {
      let partial = await new Response(chunk).text();
      res_text += partial;
      const new_message = old_message.concat([{role: "assistant", content: res_text}]);
      setMessage(new_message);
    }
  }

  async function paste(e) {
    return;
    const image_regex = /^image\/.*/;
    const items = [].slice.call(e.clipboardData.items).filter(i=> image_regex.test(i.type));
    if (items.length === 0) { return; }
    const image = items[0].getAsFile();
    const reader = new FileReader();
    setUploading(true);
    reader.onloadend = function() {
      setAttachment(attachment.concat([reader.result]));
      setUploading(false);
    }
    reader.readAsDataURL(image);
  }

  return (
    <div className="flex flex_col">
      <form onSubmit={submit} className="submit_form flex">
          <textarea className="full_width chatbox" id="chatbox" name="chatbox" placeholder="Message ChatGPT" rows={1} onKeyDown={submit} onChange={(event => setQuestion(event.target.value))} onPaste={paste} value={question}/>
          <button type="submit" id="submit_but"><Arrow/></button>
      </form>
    </div>
  );
}

const MainContent = ({message, setMessage}) => {
  //const [message, setMessage] = useState([]);

  useEffect(() => {
    let chatbox = document.getElementById("main_content");
    chatbox.scrollTop = chatbox.scrollHeight;
  }, [message]);

  return (
    <div className="Main_Content flex flex_col full_height full_width">
      <div className="">
        ChatGPT Clone
      </div>
      <div className="full_height full_width" id="main_content" style={{overflowY:"auto", marginBottom: "30px"}}>
        <div style={{maxWidth: "48rem"}} className="margin_auto">
          {message.map((item, index) => {
            return (
              <>
                {item.role === "user" ? <div className="username">You</div> : <div className="bot">ChatGPT</div>}              
                <div key={index} className={"flex flex_col chat_content fit_content" + (item.role === "user" ? " user_chat": "") }>
                  {FormatResponse({input_text: item.content})}                
                </div>
              </>
            )
          })}
        </div>
      </div>
      <BottomBar message={message} setMessage={setMessage}/>
    </div>
  )
}

function App() {
  const [message, setMessage] = useState([]);
  const [loginState, setLoginState] = useState(false);
  const mathJaxConfig = {
    options:{
      enableMenu: false,
    },
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="App full_height" style={{display:"flex"}}>
        <LeftBar setMessage={setMessage} loginState={loginState} setLoginState={setLoginState}/>
        <MainContent message={message} setMessage={setMessage}/>
      </div>
    </MathJaxContext>
  );
}

export default App;
