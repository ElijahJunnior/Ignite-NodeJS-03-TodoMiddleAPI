const express = require('express');
const cors = require('cors');

const { v4: uuidv4, validate } = require('uuid');

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

function checksExistsUserAccount(request, response, next) {
  
  // pega o username dos headers
  const { username } = request.headers;

  // busca um usuário que corresponda ao username informado
  const user = users.find(user => user.username === username);

  // verifica que se existe um usuario que atenda ao criterios
  if(!user) { 
    // retorna um erro caso o usuario não seja encontrado
    return response.status(404).json({error: "user does not exist"});
  }

  // adiciona o usuario a request 
  request.user = user;

  // avança para a próxima função do fluxo
  next();

}

function checksCreateTodosUserAvailability(request, response, next) {
  
  // busca o usuário colocado por outro middleware na request
  const { user } = request;

  // valida se o usuario é pro ou ainda não atingiu o limite de todos free
  if(user.todos.length >= 10 && !user.pro) { 
    return response.status(403).json({
      error: "the maximum limit of ten tasks in free plan has been reached"
    });
  }

  // avança para a próxima função do fluxo
  next();

}

function checksTodoExists(request, response, next) {
  
  // pega os parametros passados pelo request
  const { username } = request.headers;
  const { id } = request.params;
  
  // busca um usuário que possua o username informado
  const user = users.find(user => user.username === username);
  
  // valida se o usuário existe
  if(!user) { 
    return response.status(404).json({
      error: "user does not exist"
    });
  }
  
  // valida se o id informado é um uuid
  if(!validate(id)) { 
    return response.status(400).json({
      error: "invalid todo id"
    });
  }

  // busca um todo com o id informado
  const todo = user.todos.find(todo => todo.id === id); 

  // valida se o todo existe
  if(!todo) { 
    return response.status(404).json({
      error: "erro"
    });
  }

  // grava o usuario e o todo encontrados na requisição
  request.user = user;
  request.todo = todo;

  // avança para a próxima funçõa do fluxo
  next();

}

function findUserById(request, response, next) {
  
  // pega os parametros passados pela requisição
  const { id } = request.params;

  // busca um usuário com o id informado
  const user = users.find(user => user.id === id);

  // valida se o usuário existe
  if(!user) { 
    return response.status(404).json({ 
      error: "user does not exist"
    });
  }

  // passa o usuário encontrado para a requisição
  request.user = user; 

  // avança para a proximo função do fluxo
  next();

}

app.post('/users', (request, response) => {
  const { name, username } = request.body;

  const usernameAlreadyExists = users.some((user) => user.username === username);

  if (usernameAlreadyExists) {
    return response.status(400).json({ error: 'Username already exists' });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: []
  };

  users.push(user);

  return response.status(201).json(user);
});

app.get('/users/:id', findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch('/users/:id/pro', findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response.status(400).json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true;

  return response.json(user);
});

app.get('/todos', checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post('/todos', checksExistsUserAccount, checksCreateTodosUserAvailability, (request, response) => {
  const { title, deadline } = request.body;
  const { user } = request;

  const newTodo = {
    id: uuidv4(),
    title,
    deadline: new Date(deadline),
    done: false,
    created_at: new Date()
  };

  user.todos.push(newTodo);

  return response.status(201).json(newTodo);
});

app.put('/todos/:id', checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { todo } = request;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

app.patch('/todos/:id/done', checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

app.delete('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => {
  const { user, todo } = request;

  const todoIndex = user.todos.indexOf(todo);

  if (todoIndex === -1) {
    return response.status(404).json({ error: 'Todo not found' });
  }

  user.todos.splice(todoIndex, 1);

  return response.status(204).send();
});

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById
};