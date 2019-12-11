import React from 'react';
import { 
  Admin, 
  DeleteButton, 
  Resource, 
  ListGuesser, 
  List, 
  Datagrid, 
  Edit, 
  Create, 
  SimpleForm, 
  TextInput, 
  TextField, 
  Toolbar, 
  FileInput, 
  FileField,
  ReferenceInput,
  SelectInput,
  LongTextInput   
} from 'react-admin';

import { dataProvider } from '../helpers/dataProvider.js';
import authProvider from '../helpers/authProvider';

const NodeForm = 
    <SimpleForm>
        <TextInput source="name" />
        <TextInput multiline source="initScript" />
        <TextInput multiline source="responseScript" />
    </SimpleForm>
const NodeEdit = props => <Edit {...props}>{NodeForm}</Edit>;
const NodeCreate = props => <Create {...props}>{NodeForm}</Create>;

const NodeList = props =>
  <List {...props}>
    <Datagrid rowClick="edit">
        <TextField source="name" />
    </Datagrid>
  </List>;


const App = () => 
  <Admin dataProvider={dataProvider} authProvider={authProvider}>
    <Resource name="scriptNode" list={NodeList} edit={NodeEdit} create={NodeCreate}/>
  </Admin>

export default App;