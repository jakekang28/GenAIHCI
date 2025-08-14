import { Qna } from "src/interfaces/Qna.interface";
export class QnaDto implements Qna {
    id : Number;
    prevId : Number;
    nextId : Number;
    qcontent : string;
    acontent : string;
}