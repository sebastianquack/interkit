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

const ConfigForm = 
    <SimpleForm>
        <TextInput source="key" />
        <SelectInput source="type" choices={[
          { id: 'text', name: 'Text' },
          { id: 'number', name: 'Number' },
        ]} />
        <TextInput source="value" />
    </SimpleForm>
const ConfigEdit = props => <Edit {...props}>{ConfigForm}</Edit>;
const ConfigCreate = props => <Create {...props}>{ConfigForm}</Create>;



const App = () => 
  <Admin dataProvider={dataProvider} authProvider={authProvider}>
    <Resource name="scriptNode" list={NodeList} edit={NodeEdit} create={NodeCreate}/>
    <Resource name="config" list={ListGuesser} edit={ConfigEdit} create={ConfigCreate}/>
  </Admin>

export default App;