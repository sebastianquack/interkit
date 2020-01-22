import React, { Component } from 'react';
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
  LongTextInput,
  DateField,
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

const FileList = props =>
  <List {...props} bulkActionButtons={false}>
    <Datagrid rowClick="edit">
        <TextField source="filename" />
    </Datagrid>
  </List>;

const FileToolbar = props => 
  <Toolbar {...props}>
    <DeleteButton undoable={false} record={props.data} />
  </Toolbar>
          

class FileEdit extends Component {
  constructor(props) {
    super(props);
    this.state = {
      baseURL: ""
    };
    console.log(props);
  }

  async componentDidMount() {
    let baseUrl = ""
    let result = await fetch("/api/config?key=fileServerURL");
    let json = await result.json();
    if(json.docs.length)
      baseUrl = json.docs[0].value;

    result = await fetch("/api/file/" + this.props.id);
    json = await result.json();
    console.log(json);
    if(json)
      this.setState({url: baseUrl+json.filename});    
  }

  render() {
    return(
    <Edit {...this.props} >
      <SimpleForm toolbar={<FileToolbar />}>
        <TextField source="filename" />
        <a href={this.state.url}>link</a>
      </SimpleForm>
    </Edit>)
  }
}

const FileCreate = props => 
  <Create {...props}>
    <SimpleForm>
      <FileInput source="files" multiple={true}>
        <FileField source="filename" title="title" />
      </FileInput>
    </SimpleForm>
  </Create>

const MessageForm = 
    <SimpleForm>
        <TextInput source="message" />
        <TextInput source="label" />
        <TextInput source="attachment" />
        <TextInput source="sender" />
        <TextInput source="recipients" />
        <TextInput source="board" />
        <TextInput source="node" />
        <TextInput source="timestamp" />
        <TextInput source="seen" />
    </SimpleForm>
const MessageEdit = props => <Edit {...props}>{MessageForm}</Edit>;
const MessageCreate = props => <Create {...props}>{MessageForm}</Create>;

export const MessageList = props => (
    <List {...props} perPage={100}>
        <Datagrid rowClick="edit">
            <TextField source="recipients" />
            <TextField source="seen" />
            <TextField source="message" />
            <TextField source="sender" />
            <TextField source="label" />
            <TextField source="node" />
            <TextField source="board" />
            <DateField source="timestamp" />
            <DateField source="createdAt" />
            <TextField source="id" />
            <DateField source="updatedAt" />
        </Datagrid>
    </List>
);


const App = () => 
  <Admin dataProvider={dataProvider} authProvider={authProvider}>
    <Resource name="config" list={ListGuesser} edit={ConfigEdit} create={ConfigCreate}/>
    <Resource name="board" list={ListGuesser} edit={EditGuesser}/>
    <Resource name="scriptNode" list={NodeList} edit={NodeEdit} create={NodeCreate}/>
    <Resource name="player" list={ListGuesser} edit={PlayerEdit} create={PlayerCreate}/>
    <Resource name="variable" list={ListGuesser} edit={VarEdit} create={VarCreate}/>
    <Resource name="file" list={ListGuesser} edit={FileEdit} create={FileCreate}/>
    <Resource name="message" list={MessageList} edit={MessageEdit} create={MessageCreate}/>
    <Resource name="nodeLog" list={ListGuesser}/>
  </Admin>

export default App;