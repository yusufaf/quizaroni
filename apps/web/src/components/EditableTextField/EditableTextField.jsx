// import classNames from "classnames";
// import { withStyles } from "@material-ui/core/styles";
import { useEffect, useRef, useState } from "react";
import {
    IconButton,
    InputAdornment,
    TextField,
    Tooltip,
    Typography
} from '@mui/material/';
import { Edit } from '@mui/icons-material/';


const styles = theme => ({
    container: {
        display: "flex",
        flexWrap: "wrap",
        padding: 50
    },
    textField: {
        marginLeft: theme.spacing.unit,
        marginRight: theme.spacing.unit,
        width: 300,
        color: "black",
        fontSize: 30,
        opacity: 1,
        borderBottom: 0,
        "&:before": {
            borderBottom: 0
        }
    },
    disabled: {
        color: "black",
        borderBottom: 0,
        "&:before": {
            borderBottom: 0
        }
    },
    btnIcons: {
        marginLeft: 10
    }
});

const EditableTextField = props => {

    const [editedValue, setEditedValue] = useState("");
    const [isEditing, setIsEditing] = useState(false)
    const [mouseOver, setMouseOver] = useState(false)

    handleChange = event => {
        this.setState({ [event.target.name]: event.target.value });
    };

    const handleMouseOver = event => {
        if (!mouseOver) {
            setMouseOver: true });
        }
    };

    const handleMouseOut = event => {
        // The problem is here!!!
        if (this.state.mouseOver) {
            this.setState({ mouseOver: false });
        }
    };

    const handleClick = () => {
        setIsEditing(true);
        setMouseOver(false);
    };


    const { classes, value } = this.props;

    return (
        <div className={classes.container}>
            <TextField
                name="email"
                defaultValue={value}
                // error={editedValue === ""}
                onChange={this.handleChange}
                disabled={!isEditing}
                // className={classes.textField}
                onMouseEnter={this.handleMouseOver}
                onMouseLeave={this.handleMouseOut}
                InputProps={{
                    classes: {
                        disabled: classes.disabled
                    },
                    endAdornment: this.state.mouseOver ? (
                        <InputAdornment position="end">
                            <IconButton onClick={this.handleClick}>
                                <Edit />
                            </IconButton>
                        </InputAdornment>
                    ) : (
                        ""
                    )
                }}
            />
        </div>
    )
}

export default EditableTextField;