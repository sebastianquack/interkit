import React from 'react';
import { 
  Admin, 
  DeleteButton, 
  Resource, 
  EditGuesser,
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

const NodeForm = 
    <SimpleForm>
        <TextInput source="name" />
        <TextInput multiline source="script" />
    </SimpleForm>
const NodeEdit = props => <Edit {...props}>{NodeForm}</Edit>;
const NodeCreate = props => <Create {...props}>{NodeForm}</Create>;
const NodeList = props =>
  <List {...props}>
    <Datagrid rowClick="edit">
        <TextField source="name" />
    </Datagrid>
  </List>;

const PlayerForm = 
    <SimpleForm>
    </SimpleForm>
const PlayerEdit = props => <Edit {...props}>{PlayerForm}</Edit>;
const PlayerCreate = props => <Create {...props}>{PlayerForm}</Create>;

const VarForm = 
    <SimpleForm>
        <TextInput source="key" />
        <TextInput source="value" />
        <SelectInput source="varScope" choices={[
          { id: 'player', name: 'player' },
          { id: 'playerNode', name: 'playerNode' },
          { id: 'node', name: 'node' },
          { id: 'board', name: 'board' },
        ]} />

        <ReferenceInput label="player" source="player" reference="player" perPage={200} allowEmpty>
          <SelectInput optionText="id"/>
        </ReferenceInput>

        <ReferenceInput label="node" source="script" reference="scriptNode" perPage={200} allowEmpty>
          <SelectInput optionText="name"/>
        </ReferenceInput>

        <ReferenceInput label="board" source="board" reference="board" perPage={200} allowEmpty>
          <SelectInput optionText="name"/>
        </ReferenceInput>
        
    </SimpleForm>
const VarEdit = props => <Edit {...props}>{VarForm}</Edit>;
const VarCreate = props => <Create {...props}>{VarForm}</Create>;


const App = () => 
  <Admin dataProvider={dataProvider} authProvider={authProvider}>
    <Resource name="config" list={ListGuesser} edit={ConfigEdit} create={ConfigCreate}/>
    <Resource name="board" list={ListGuesser} edit={EditGuesser}/>
    <Resource name="scriptNode" list={NodeList} edit={NodeEdit} create={NodeCreate}/>
    <Resource name="player" list={ListGuesser} edit={PlayerEdit} create={PlayerCreate}/>
    <Resource name="variable" list={ListGuesser} edit={VarEdit} create={VarCreate}/>
  </Admin>

export default App;